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

		envelope: {
			iv: "3bbdce68b2736ed96972d56865ad82a2",
			ke: "a891f95cc50bd872e8fcd96cf5030535e273c5210570b3dcfa7946873d167c57",
			snd: "",
			rcv: "",
			payload: "asdfasdf",
			seqnum: 587
		},

		messages: [],
		users: [],
	},

	methods: {
		sendMessage: function(e) {
			e.preventDefault();

			var iv = CryptoJS.enc.Hex.parse(this.envelope.iv);
			var ke = CryptoJS.enc.Hex.parse(this.envelope.ke);
			var payload = this.envelope.payload;
			var seqnum = this.envelope.seqnum;
			var snd = this.envelope.snd;
			var rcv = this.envelope.rcv;
			var cht = 0;

			var cipherobj = CryptoJS.AES.encrypt(
				payload,
				ke,
				{
					iv : iv, 
				}
			).ciphertext;

			console.log(CryptoJS.enc.Hex.stringify(cipherobj));

			var header = CryptoJS.enc.Hex.parse([
				"0001",
				"00",
				("00000000" + cipherobj.sigBytes.toString(16)).substr(-8),
				("00000000" + parseInt(seqnum).toString(16)).substr(-8),
				("0000" + parseInt(snd).toString(16)).substr(-8),
				("0000" + parseInt(rcv).toString(16)).substr(-8),
				("0000" + parseInt(cht).toString(16)).substr(-8),
				("000000000000" + Date.now().toString(16)).substr(-8)
			].join(""));

			var envelope = header + iv + cipherobj + ke + "deadbeef";
			console.log(envelope);
			socket.emit('msg', envelope);
		},

		getMessagesFromDatabase: function() {
			axios.get('messages?recipient=2')
			.then(function (response) {
				console.log(response.data);
				response.data.forEach(function(r) {
					app.messages.push(r.content)
				})
			})
			.catch(function (error) {
				console.log(error);
			});
		},

		getUsersFromDatabase: function() {
			axios.get('users')
			.then(function(response) {
				app.users = response.data
			});
		}
	},

	mounted: function () {
		this.getMessagesFromDatabase();
		this.getUsersFromDatabase();
	}
});