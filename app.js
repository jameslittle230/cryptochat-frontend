var axios = require('axios');
var CryptoJS = require('crypto-js');
var NodeRSA = require('node-rsa');

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
	app.messages.push(msg);
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

			this.getPrivateKey(this.selectedUser.user_id);

			axios.get('chats?user_id=' + this.selectedUser.user_id)
			.then(function(response) {
				var chats = response.data;

				chats.forEach(function(chat) {
					console.log(chat);
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

			var cipherobj = CryptoJS.AES.encrypt(
				payload, ke, {iv: iv}
			).ciphertext;

			var header = CryptoJS.enc.Hex.parse([
				"0001",
				"00",
				("00000000" + cipherobj.sigBytes.toString(16)).substr(-8),
				("00000000" + parseInt(seqnum).toString(16)).substr(-8),
				("0000" + parseInt(snd).toString(16)).substr(-4),
				("0000" + parseInt(rcv).toString(16)).substr(-4),
				("0000" + parseInt(cht).toString(16)).substr(-4),
				("000000000000" + Date.now().toString(16)).substr(-12)
			].join(""));

			this.getPublicKey(rcv, function(rcv_pubkey_pem) {
				var rcv_pubkey = new NodeRSA();
				rcv_pubkey.importKey(rcv_pubkey_pem);
				ke = rcv_pubkey.encrypt(ke, 'hex', 'hex');

				var snd_privkey = new NodeRSA();
				snd_privkey.importKey(snd_privkey_pem, 'private');
				var sigData = header + iv + cipherobj + ke;
				var sig = snd_privkey.sign(sigData, 'hex', 'hex');

				var envelope = header + iv + cipherobj + ke + sig;
				console.log(envelope);
				callback(envelope);
			});
		},

		sendMessage: function(e) {
			this.chats[this.selectedChat].members.forEach(function(member) {
				var envelope = app.generateEnvelope(member.user_id, function(envelope) {
					console.log("Sending message\n", envelope);
					socket.emit('msg', envelope);
				});
			});
		},

		getMessagesFromDatabase: function() {
			axios.get('messages?recipient=2')
			.then(function (response) {
				response.data.forEach(function(r) {
					app.messages.push(r.content)
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

		getPrivateKey: function(user_id) {
			axios.get('privateKey?user_id=' + user_id)
			.then(function(response) {
				app.selectedUser.private_key = response.data;
			});
		}
	},

	mounted: function () {
		this.getMessagesFromDatabase();
		this.getUsersFromDatabase();
	}
});