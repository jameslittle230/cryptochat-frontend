global.axios = require('axios');
global.Vue = require('vue/dist/vue.js')
global.CryptoJS = require('crypto-js');
global.NodeRSA = require('node-rsa');
global.Moment = require('moment')

try { io } catch(e) {
	console.log("Not connected to IO.")
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

socket.on('connect', () => {axios.defaults.headers.common['socket_id'] = socket.id;});
socket.on('msg', (msg) => {app.recieveMessage(msg)});
socket.on('key-reload', () => {app.refreshKeys()});
socket.on('user-reload', () => {app.refreshUsers()});
socket.on('chat-reload', () => {app.refreshChats()});

function getRandomValue(length) {
	if(length > 128) return 0;

	var output = "";

	var array = new Uint8Array(length / 2);
	window.crypto.getRandomValues(array);

	for (var i = array.length - 1; i >= 0; i--) {
		output += array[i].toString(16).padStart(2, "0");
	}

	return output;
}

function getRandomIV() {return getRandomValue(32);}
function getRandomKE() {return getRandomValue(64);}

require('./loginForm.js');
require('./registerForm.js');
require('./chatSelect.js');
require('./message.js');

global.app = new Vue({
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
		messageDrafts: {},

		// Other cache data
		messages: [],
		decryptedMessages: [],
		users: [],

		// New Chat Data
		isChatCreationDialogOpen: false,
		potentialChatUsers: [],
	},

	computed: {
		canUseChatInterface: function() {
			return this.selectedChat != null;
		},

		currentSenderPrivateKey: function() {
			return this.keys.filter((key) => {return key.user_id == app.currentUser.user_id && key.expired_at == null})[0].private_key;
		}
	},

	methods: {
		generateNewRsaKeypair(password) {
			var key = new NodeRSA();
			key.generateKeyPair(1024);
			var public = key.exportKey('public');
			var private = key.exportKey('private');

			var iv = getRandomIV();

			private = CryptoJS.AES.encrypt(
				private, password, {iv: iv}
			);

			private = iv + CryptoJS.enc.Base64.parse(private.toString()).toString(CryptoJS.enc.hex);

			var output = {
				"public": public,
				"private": private,
			};

			return output;
		},

		processSuccessfulLoginWithCredentials(user, password) {
			this.password = password;
			this.currentUser = user;

			console.log("Current User Set");

			Vue.nextTick(() => {
				this.loadDataAfterLogin()
				.then(app.decryptLoadedKeys)
				.then(app.decryptMessages)
				.then(() => {
					NProgress.done();
					app.selectedChat = app.chats.length > 0 ? app.chats[0].chat_id : null;
					app.uiState = "chat";
					Vue.nextTick(app.scrollChatWindow);
				})
			})
		},

		loadDataAfterLogin() {
			console.log("Loading login data")
			return axios.get('loadData?user_id=' + app.currentUser.user_id)
			.then(function (response) {
				app.keys = response.data.data.keys;
				app.chats = response.data.data.chats;
				app.messages = response.data.data.messages;
				app.users = response.data.data.users;
				console.log("Data loaded");
			});
		},

		refreshKeys() {
			console.log("Refreshing keys from new user login");

			if(!this.currentUser) {
				console.log("Current user not set, not refreshing keys");
				return;
			}

			return axios.get('loadData?keys=true&user_id=' + this.currentUser.user_id)
			.then(function(response) {
				app.keys = response.data.data.keys;
				console.log("Keys reloaded")
			})
			.then(app.decryptLoadedKeys)
		},

		refreshUsers() {
			console.log("Refreshing users from new user creation");
			return axios.get('loadData?users=true&user_id=' + this.currentUser.user_id)
			.then(function(response) {
				app.users = response.data.data.users;
				console.log("Users reloaded");
			})
			.then(app.refreshKeys)
		},

		refreshChats() {
			console.log("Refreshing chats from new chat creation")
			return axios.get('loadData?chats=true&user_id=' + this.currentUser.user_id)
			.then(function(response) {
				app.chats = response.data.data.chats;
				console.log("Chats reloaded")
			})
		},

		decryptLoadedKeys() {
			return new Promise((resolve, reject) => {
				app.keys.map(key => {
					if(key.user_id == app.currentUser.user_id) {
						let iv = key.private_key_enc.substring(0, 32);
						var ciphertext = key.private_key_enc.substring(32, key.private_key_enc.length);
						ciphertext = CryptoJS.enc.Hex.parse(ciphertext).toString(CryptoJS.enc.Base64);
						var cipherobj = CryptoJS.AES.decrypt(
							ciphertext, this.password, {iv: iv}
						);

						try{var private = cipherobj.toString(CryptoJS.enc.Utf8)}
						catch(e) {console.log(e)};
						key.private_key = private
					}
					return key;
				});
				console.log("Keys decrypted");
				resolve();
			});
		},

		decryptMessages() {
			return new Promise((resolve, reject) => {
				app.decryptedMessages = app.messages.map(m => app.parseMessage(m.content))
				console.log("Messages decrypted")
				resolve();
			});
		},

		generateEnvelope: function(message, rcv_id) {
			var iv = getRandomIV();
			var ke = getRandomKE();
			var payload = message;
			var seqnum = this.chats.filter(c => c.chat_id == this.selectedChat)[0].sequence_number;
			var snd = this.currentUser.user_id;
			var rcv = rcv_id;
			var cht = this.selectedChat;
			var snd_privkey_pem = this.currentSenderPrivateKey;

			var ciphertext = CryptoJS.AES.encrypt(
				payload, ke, {iv: iv}
			);

			ciphertext = ciphertext.toString();
			ciphertext = CryptoJS.enc.Base64.parse(ciphertext).toString(CryptoJS.enc.hex);

			var header = CryptoJS.enc.Hex.parse([
				"0001",
				"00",
				("00000000" + ciphertext.length.toString(16)).substr(-8),
				("00000000" + parseInt(seqnum).toString(16)).substr(-8),
				("0000" + parseInt(snd).toString(16)).substr(-4),
				("0000" + parseInt(rcv).toString(16)).substr(-4),
				("0000" + parseInt(cht).toString(16)).substr(-4),
				("00000000" + ((Math.floor(Date.now()/1000)).toString(16))).substr(-8)
			].join(""));

			var rcv_pubkey_pem = this.currentPublicKeyForUser(rcv);
			var rcv_pubkey = new NodeRSA();
			rcv_pubkey.importKey(rcv_pubkey_pem, 'public');
			ke = rcv_pubkey.encrypt(ke, 'hex', 'hex');

			var snd_privkey = new NodeRSA();
			snd_privkey.importKey(snd_privkey_pem, 'private');
			var sigData = header + iv + ciphertext + ke;
			var sig = snd_privkey.sign(sigData, 'hex', 'hex');

			var envelope = header + iv + ciphertext + ke + sig;
			return envelope;
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
				timestamp = parseInt(msg.substring(34, 42), 16);

				iv = msg.substring(42, 74);

				payload_endindex = 74 + len;
				payload = msg.substring(74, payload_endindex);
				ke = msg.substring(payload_endindex, payload_endindex+256);
				sig = msg.substring(payload_endindex+64, payload_endindex+256+256);

				var key = new NodeRSA(this.publicKeyForUserAndTimestamp(snd, timestamp));
				var sigData = version + type + len + seq_num + snd + rcv + cht + timestamp + iv + payload + ke;
				if(!key.verify(sigData, sig, 'hex', 'hex')) {
					return false;
				}

				if(!chats[cht].sequence_number != seq_num) {
					return false;
				}

				chats[cht].sequence_number++;

				var rcv_privkey = new NodeRSA();
				var rcv_privkey_pem = this.privateKeyForTimestamp(timestamp);
				rcv_privkey.importKey(rcv_privkey_pem, "private");
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
			e.preventDefault();
			const message = this.messageDrafts[this.selectedChat];
			this.messageDrafts[this.selectedChat] = "";
			this.chats.filter(c => c.chat_id == this.selectedChat)[0].members.forEach(function(member) {
				var envelope = app.generateEnvelope(message, member.user_id)
				socket.emit('msg', envelope);
			});
		},

		recieveMessage: function(msg) {
			msg = this.parseMessage(msg);
			if(!msg) {
				return;
			}
			this.decryptedMessages.push(msg)
			Vue.nextTick(app.scrollChatWindow);
		},

		currentPublicKeyForUser(user_id) {
			keys = this.keys.filter((key) => {return key.user_id == user_id && key.expired_at == null});
			if(keys.length == 0) {
				return null;
			}
			return keys[0].public_key;
		},

		keyForUserAndTimestamp(user_id, timestamp) {
			keys = this.keys.filter((key) => {
				let validDate = Moment.unix(timestamp).isBetween(
					Moment.utc(key.created_at), 
					key.expired_at ? Moment.utc(key.expired_at) : Moment.utc(Date.now())
				);
				let validUser = key.user_id == user_id;
				return validDate && validUser;
			});

			if(keys.length == 0 || !keys[0].private_key) {
				return null;
			}
			return keys[0];
		},

		publicKeyForUserAndTimestamp(user_id, timestamp) {
			return this.keyForUserAndTimestamp(user_id, timestamp).public_key
		},

		privateKeyForTimestamp(timestamp) {
			return this.keyForUserAndTimestamp(this.currentUser.user_id, timestamp).private_key
		},

		scrollChatWindow() {
			var element = document.getElementById('messageList');
			element.scrollTop = element.scrollHeight
		},

		openChatCreationDialog() {
			this.isChatCreationDialogOpen = true;
		},

		closeChatCreationDialog() {
			this.isChatCreationDialogOpen = false;
			this.potentialChatUsers = [];
		},

		toggleUserInPotentialChat(user_id) {
			if(this.potentialChatUsers.indexOf(user_id) == -1) {
				this.potentialChatUsers.push(user_id);
			} else {
				var index = array.indexOf(user_id);
				array.splice(index, 1);
			}
		},

		createChat() {
			this.potentialChatUsers.push(this.currentUser.user_id)
			axios({
				method: 'post',
				url: 'newChat',
				data: {
					user_id: this.currentUser.user_id,
					members: JSON.stringify(this.potentialChatUsers)
				}
			}).then((response) => {
				if(response.data.success) {
					this.closeChatCreationDialog()
				}
			});
		},
	},

	watch: {
		selectedChat: function (newQuestion, oldQuestion) {
			Vue.nextTick(app.scrollChatWindow);
		}
	},
});