global.axios = require('axios');
global.Vue = require('vue/dist/vue.js')
global.CryptoJS = require('crypto-js');
global.NodeRSA = require('node-rsa');
global.Moment = require('moment')

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

socket.on('key-response', function(data) {
	console.log("Key has been recieved by server");
	if(data.success) {
		app.loadDataAfterLogin()
		.then(app.decryptLoadedKeys)
		.then(app.decryptMessages)
		.then(function() {
			app.uiState = "chat";
		})
		.catch(alert)
	}
});

socket.on('key-reload', function(data) {
	console.log("New user login, refreshing keys");
	if(data.success) {
		app.refreshKeys()
		.then(app.decryptLoadedKeys)
		.catch(alert)
	}
});

var publicKey = "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCZOREAzNdcbciCWnG+L4B5Fh1ApyL1/LyKN45IkkPb+8oVb4lMSC2UF1UyYGz2E/JT5HAqoFz2n1XXftgTL7lJl6dz9U6wAYPToMmRppQSBeEaubqKgg5/JcBdapAKQO9PYfcfTHic0AnDQM4JLbeS9ejdhMXmrOeTwU+JNEUBZwIDAQAB"
var privatekey = "MIICWwIBAAKBgQCZOREAzNdcbciCWnG+L4B5Fh1ApyL1/LyKN45IkkPb+8oVb4lMSC2UF1UyYGz2E/JT5HAqoFz2n1XXftgTL7lJl6dz9U6wAYPToMmRppQSBeEaubqKgg5/JcBdapAKQO9PYfcfTHic0AnDQM4JLbeS9ejdhMXmrOeTwU+JNEUBZwIDAQABAoGAcsNyf9XtrLYxy6jwrtGneYpdyLInFnYBxcjM0oBzQU67UwjinnclZFmBn6Tnl/zisYFVnifU2YgIZMsGDoDdVx9b9/D+0ZMgw16nDOhLXvu/5T6kp4uIrWhudaH5+5krtFk10MpLGB28eZhwHnNuUlsfOOBk4T5KQoxdDFp84PECQQDTzW5F2DRM5pvPNz8IPGvrRGH9XsmClWPNTJJet82eof5knT4WKR/mC1PqcFzxSkH2ipTxGJqII3w8RcptBhz5AkEAuTJLKwijF1oxzE/7abF0It5YSv2CLJ7C1lfsMSa2b1T9j+NFDqI1tMehrNtVl7HZ0RiDoC3a0NcCI6KkQDeJXwJALLLzLcxWJVCZ2152b/+Iawtwfq9taaCrgl1BmrnBrFPVw1goDTc6oysK17RE+StJxoUyr7sYidirVHEKKn4ayQJAKBfHRi28gRW5qi22lA8iwVm5a6KuR9KnA5hNPebPoBKaQkhFbwGW9ugxDCb/xLNwIGBaPpcuw/+IKwbO4EglqQJAD2QtgBufaF/fXPIu4/Zb7J8zAil2bZC5tMzPp/DSarUkhl9AC7XfTMFxD0BegYXvkKbP3Mzwk1ZieOTyZ+UWVA=="

function getRandomIV() {return "3bbdce68b2736ed96972d56865ad82a2";}
function getRandomKE() {return "a891f95cc50bd872e8fcd96cf5030535e273c5210570b3dcfa7946873d167c57";}

require('./loginForm.js');
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
		selectedChat: 0,

		// Drafts
		messageDrafts: {},

		// Other cache data
		messages: [],
		decryptedMessages: [],
		users: [],
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
		processSuccessfulLoginWithCredentials(user, password) {
			this.password = password;
			this.currentUser = user;

			console.log("Generating new login key");

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
			return axios.get('loadUserData?user_id=' + this.currentUser.user_id)
			.then(function (response) {
				app.keys = response.data.keys;
				app.chats = response.data.chats;
				app.messages = response.data.messages;
				console.log("Data loaded");
			});
		},

		refreshKeys() {
			return axios.get('loadUserData?keysonly=true&user_id=' + this.currentUser.user_id)
			.then(function(response) {
				console.log(response.data);
				app.keys = response.data.keys;
				console.log("Keys reloaded")
			})
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

					// key.private_key = key.private_key_enc;
					// return key;
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

		generateEnvelope: function(rcv_id, callback) {
			var iv = getRandomIV();
			var ke = getRandomKE();
			var payload = this.messageDrafts[this.selectedChat];
			var seqnum = this.chats[this.selectedChat].sequence_number;
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

			console.log()

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
			this.chats[this.selectedChat].members.forEach(function(member) {
				var envelope = app.generateEnvelope(member.user_id)
				console.log(envelope);
				socket.emit('msg', envelope);
			});
			app.messageDrafts[app.selectedChat] = "";
		},

		recieveMessage: function(msg) {
			msg = this.parseMessage(msg);
			this.decryptedMessages.push(msg)
		},

		currentPublicKeyForUser(user_id) {
			keys = this.keys.filter((key) => {return key.user_id == user_id && key.expired_at == null});
			if(keys.length == 0) {
				return null;
			}
			return keys[0].public_key;
		},

		privateKeyForTimestamp(timestamp) {

			keys = this.keys.filter((key) => {
				let validDate = Moment.unix(timestamp).isBetween(
					Moment.utc(key.created_at), 
					key.expired_at ? Moment.utc(key.expired_at) : Moment.utc(Date.now())
				);
				let validUser = key.user_id == app.currentUser.user_id;
				return validDate && validUser;
			});

			if(keys.length == 0 || !keys[0].private_key) {
				return null;
			}
			return keys[0].private_key;
		}
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
