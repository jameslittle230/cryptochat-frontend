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

var app = new Vue({
	el: '#app',
	data: {
		connectionWarning: false,

		messageDraftData: {
			iv: "3bbdce68b2736ed96972d56865ad82a2",
			ke: "a891f95cc50bd872e8fcd96cf5030535e273c5210570b3dcfa7946873d167c57",
			snd: "1",
			rcv: "",
			payload: "asdfasdf",
			seqnum: 587,
			rcvPubPem: "",
			sndPrivPem: ""
		},

		messages: [],
		users: [],

		newuser_username: "",
		newuser_password: "",
	},

	computed: {
		envelope: function() {
			var iv = CryptoJS.enc.Hex.parse(this.messageDraftData.iv);
			var ke = CryptoJS.enc.Hex.parse(this.messageDraftData.ke);
			var payload = this.messageDraftData.payload;
			var seqnum = this.messageDraftData.seqnum;
			var snd = this.messageDraftData.snd;
			var rcv = this.messageDraftData.rcv;
			var cht = 0;
			var sig = "";

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

			if(this.messageDraftData.rcvPubPem && this.messageDraftData.sndPrivPem) {
				var rcvPubkey = new NodeRSA();
				rcvPubkey.importKey(this.messageDraftData.rcvPubPem);
				ke = rcvPubkey.encrypt(ke, 'hex', 'hex');

				var sndPrivkey = new NodeRSA(this.messageDraftData.sndPrivPem, 'private');
				var sigData = header + iv + cipherobj + ke;
				sig = sndPrivkey.sign(sigData, 'hex', 'hex');
			}

			var envelope = header + iv + cipherobj + ke + sig;
			return envelope;
		}
	},

	methods: {
		sendMessage: function(e) {
			socket.emit('msg', this.envelope);
			this.randomizeThings();
		},

		randomizeThings: function() {
			this.envelope.seqnum++;

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

		createNewUser: function() {
			alert("New user");
		},

		getPublicKey: function(user_id) {
			axios.get('publicKey?user_id=' + user_id)
			.then(function(response) {
				app.messageDraftData.rcvPubPem = response.data;
			});
		},

		getPrivateKey: function(user_id) {
			axios.get('privateKey?user_id=' + user_id)
			.then(function(response) {
				app.messageDraftData.sndPrivPem = response.data;
			});
		}
	},

	watch: {
		'messageDraftData.rcv': function(val) {
			this.getPublicKey(val);
		}
	},

	mounted: function () {
		this.getMessagesFromDatabase();
		this.getUsersFromDatabase();
		this.getPrivateKey(this.messageDraftData.snd);
	}
});