global.axios = require('axios');
global.Vue = require('vue/dist/vue.js')

var CryptoJS = require('crypto-js');
var NodeRSA = require('node-rsa');
var Moment = require('moment')

try { io } catch(e) {
	app.connectionWarning = true;
}

global.socket;

if(window.location.hostname == "localhost" || window.location.hostname == "127.0.0.1") {
	socket = io('http://localhost:8080/');
	axios.defaults.baseURL = 'http://localhost:8080/';
} else {
	socket = io('http://penguinegg.com:8080');
	axios.defaults.baseURL = 'http://penguinegg.com:8080/';
}

socket.on('connect', () => {
  axios.defaults.headers.common['socket_id'] = socket.id;
});

socket.on('msg', function(msg){
	app.recieveMessage(msg);
});

socket.on('log', function(log) {
	console.log("Server Log: " + log);
});

socket.on('key-request', function() {
	console.log("key request");
	if(!app.password || !app.currentUser) {
		socket.emit('key-response', {
			error: true,
			reason: "App password not set"
		});

		return;
	}

	var key = new NodeRSA();
	key.generateKeyPair(1024);
	var public = key.exportKey('public');
	var private = key.exportKey('private');

	private = CryptoJS.AES.decrypt(
		key.private, app.password
	);

	var output = {
		"public": public,
		"private": private,
	};

	socket.emit('key-response', {
		"user_id": app.currentUser.id,
		"key": output
	})
});

socket.on('key-response', function(data) {
	console.log("Client got key response");
	if(data.success) {
		app.loadDataAfterLogin()
		.then(app.decryptLoadedKeys)
		.then(function() {
			app.uiState = "chat";
		})
	}
})

function getRandomIV() {return "3bbdce68b2736ed96972d56865ad82a2";}
function getRandomKE() {return "a891f95cc50bd872e8fcd96cf5030535e273c5210570b3dcfa7946873d167c57";}

require('./loginForm.js');

var app = new Vue({
	el: '#app',
	data: {
		uiState: "login", // login, register, chat

		// User/Cryptographic information
		currentUser: null,
		password: null,
		keys: [],

		// Chats
		chats: [],
		selectedChat: null,

		// Drafts
		messageDraftData: {
			payload: "",
		},

		// Other cache data
		messages: [],
		users: [],
	},

	computed: {
		canUseChatInterface: function() {
			return this.selectedChat != null;
		}
	},

	methods: {
		processSuccessfulLoginWithCredentials(user, password) {
			console.log("Login successful with creds", user.username, password);
			this.password = password;
			this.currentUser = user;

			var key = new NodeRSA();
			key.generateKeyPair(1024);
			var public = key.exportKey('public');
			var private = key.exportKey('private');

			private = CryptoJS.AES.encrypt(
				private, this.password
			);

			private = CryptoJS.enc.Base64.parse(private.toString()).toString(CryptoJS.enc.hex);

			var output = {
				"public": public,
				"private": private,
			};

			socket.emit('key-submit', {
				"socket_id": socket.id,
				"user_id": this.currentUser.user_id,
				"key": output
			});
		},

		loadDataAfterLogin() {
			return axios.get('loadUserData')
			.then(function (response) {
				app.keys = response.data.keys;
				app.chats = response.data.chats;
				app.messages = response.data.messages;
			});
		},

		decryptLoadedKeys() {
			return new Promise((resolve, reject) => {
				app.keys.map(key => {
					if(key.user_id == app.currentUser.user_id) {
						let ciphertext = CryptoJS.enc.Hex.parse(key.private_key_enc).toString(CryptoJS.enc.Base64);
						var cipherobj = CryptoJS.AES.decrypt(
							ciphertext, this.password
						);

						var private = cipherobj.toString(CryptoJS.enc.Utf8);
						key.private_key = private
					}
					return key;
				});
				resolve();
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
					app.messageDraftData.payload = "";
				});
			});
		},

		recieveMessage: function(msg) {
			msg = this.parseMessage(msg);
			this.messages.push(msg)
		},
	},

	filters: {
		timeago: function (value) {
			if (!value) return ''
			return Moment(value).fromNow();
		},

		fullName: function(id) {
			if(!id) return '';
			user = app.users.filter(u => u.user_id == id)[0];
			return user.first_name + " " + user.last_name;
		}
	}
});
