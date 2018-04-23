var axios = require('axios');
var CryptoJS = require('crypto-js');
var NodeRSA = require('node-rsa');
var Moment = require('moment')

try { io } catch(e) {
	app.connectionWarning = true;
}

var socket;

if(window.location.hostname == "localhost" || window.location.hostname == "127.0.0.1") {
	socket = io('http://localhost:8080/');
	axios.defaults.baseURL = 'http://localhost:8080/';
} else {
	socket = io('http://penguinegg.com:8080');
	axios.defaults.baseURL = 'http://penguinegg.com:8080/';
}

socket.on('msg', function(msg){
	app.recieveMessage(msg);
});

socket.on('log', function(log) {
	console.log("Server Log: " + log);
});

function getRandomIV() {return "3bbdce68b2736ed96972d56865ad82a2";}
function getRandomKE() {return "a891f95cc50bd872e8fcd96cf5030535e273c5210570b3dcfa7946873d167c57";}

var app = new Vue({
	el: '#app',
	data: {
		connectionWarning: false,
		isUserSelected: false,
		selectedUser: {
			user_id: null,
			private_key: null
		},

		canSelectChat: false,
		chats: {},
		selectedChat: null,

		messageDraftData: {
			payload: "asdfasdf",
		},

		messages: [],
		users: [],

		newuser_username: "",
		newuser_password: "",
	},

	computed: {
		canUseChatInterface: function() {
			return this.selectedChat != null;
		}
	},

	methods: {
		selectUser: function() {
			this.isUserSelected = true;

			socket.emit('login', this.selectedUser.user_id);

			this.getPrivateKey(this.selectedUser.user_id, function() {
				app.getMessagesFromDatabase();
			});

			axios.get('chats?user_id=' + this.selectedUser.user_id)
			.then(function(response) {
				var chats = response.data;

				chats.forEach(function(chat) {
					app.chats[chat.chat_id] = {
						chat_id: chat.chat_id,
						seqnum: chat.sequence_number,
						members: chat.members,
						desc: chat.members.filter(m => m.user_id != app.selectedUser.user_id).map(m => m.first_name + " " + m.last_name).join(", ")
					};
				});

				app.canSelectChat = true;
			});
		},

		generateEnvelope: function(rcv_id, callback) {
			var iv = getRandomIV();
			var ke = getRandomKE();
			var payload = this.messageDraftData.payload;
			var seqnum = this.chats[this.selectedChat].seqnum;
			var snd = this.selectedUser.user_id;
			var rcv = rcv_id;
			var cht = this.selectedChat;
			var snd_privkey_pem = this.selectedUser.private_key;

			var ciphertext = CryptoJS.AES.encrypt(
				payload, ke, {iv: iv}
			);

			ciphertext = ciphertext.toString();
			ciphertext = CryptoJS.enc.Base64.parse(ciphertext).toString(CryptoJS.enc.hex)

			var header = CryptoJS.enc.Hex.parse([
				"0001",
				"00",
				("00000000" + ciphertext.length.toString(16)).substr(-8),
				("00000000" + parseInt(seqnum).toString(16)).substr(-8),
				("0000" + parseInt(snd).toString(16)).substr(-4),
				("0000" + parseInt(rcv).toString(16)).substr(-4),
				("0000" + parseInt(cht).toString(16)).substr(-4),
				("000000000000" + Date.now().toString(16)).substr(-12)
			].join(""));

			this.getPublicKey(rcv, function(rcv_pubkey_pem) {
				var rcv_pubkey = new NodeRSA();
				rcv_pubkey.importKey(rcv_pubkey_pem, 'public');
				ke = rcv_pubkey.encrypt(ke, 'hex', 'hex');

				var snd_privkey = new NodeRSA();
				snd_privkey.importKey(snd_privkey_pem, 'private');
				var sigData = header + iv + ciphertext + ke;
				var sig = snd_privkey.sign(sigData, 'hex', 'hex');

				var envelope = header + iv + ciphertext + ke + sig;
				callback(envelope);
			});
		},

		parseMessage: function(msg) {
			var version = msg.substring(0, 4);
			var type, len, seq_num, snd, rcv, cht, timestamp;

			if(version == "0001") {
				type = msg.substring(4, 6);
				len = parseInt(msg.substring(6, 14), 16);
				seq_num = parseInt(msg.substring(14, 22), 16);
				snd = parseInt(msg.substring(22, 26), 16);
				rcv = parseInt(msg.substring(26, 30), 16);
				cht = parseInt(msg.substring(30, 34), 16);
				timestamp = parseInt(msg.substring(34, 46), 16);

				iv = msg.substring(46, 78);

				payload_endindex = 78 + len;
				payload = msg.substring(78, payload_endindex);
				ke = msg.substring(payload_endindex, payload_endindex+256);
				sig = msg.substring(payload_endindex+64, payload_endindex+256+256);

				var rcv_privkey = new NodeRSA();
				rcv_privkey.importKey(this.selectedUser.private_key, "private");
				ke = CryptoJS.enc.Hex.parse(ke).toString(CryptoJS.enc.Base64);
				ke = rcv_privkey.decrypt(ke, 'hex');

				var ciphertext = CryptoJS.enc.Hex.parse(payload).toString(CryptoJS.enc.Base64);

				var cipherobj = CryptoJS.AES.decrypt(
					ciphertext, ke, {iv: iv}
				);

				var plaintext = cipherobj.toString(CryptoJS.enc.Utf8);
			}

			return {
				type: type,
				snd: snd,
				rcv: rcv,
				cht: cht,
				timestamp: timestamp,
				content: plaintext
			};
		},

		sendMessage: function(e) {
			this.chats[this.selectedChat].members.forEach(function(member) {
				var envelope = app.generateEnvelope(member.user_id, function(envelope) {
					socket.emit('msg', envelope);
				});
			});
		},

		recieveMessage: function(msg) {
			msg = this.parseMessage(msg);
			this.messages.push(msg)
		},

		getMessagesFromDatabase: function() {
			axios.get('messages?recipient=' + this.selectedUser.user_id)
			.then(function (response) {
				response.data.forEach(function(r) {
					var msg = app.parseMessage(r.content)
					app.messages.push(msg);
				})
			})
		},

		getUsersFromDatabase: function() {
			axios.get('users')
			.then(function(response) {
				app.users = response.data
			});
		},

		getPublicKey: function(user_id, callback) {
			axios.get('publicKey?user_id=' + user_id)
			.then(function(response) {
				callback(response.data);
			});
		},

		getPrivateKey: function(user_id, callback) {
			axios.get('privateKey?user_id=' + user_id)
			.then(function(response) {
				app.selectedUser.private_key = response.data;
				callback(response.data);
			});
		}
	},

	mounted: function () {
		this.getUsersFromDatabase();
	},

	filters: {
		timeago: function (value) {
			if (!value) return ''
			return Moment(value).fromNow();
		}
	}
});