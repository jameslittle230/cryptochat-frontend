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
			km: "80070713463e7749b90c2dc24911e275",
			payload: "asdfasdf",
			seqnum: 587
		},

		messages: []
	},

	methods: {
		generateEnvelope: function(e) {
			e.preventDefault();

			var iv = CryptoJS.enc.Hex.parse(this.envelope.iv);
			var ke = CryptoJS.enc.Hex.parse(this.envelope.ke);
			var km = CryptoJS.enc.Hex.parse(this.envelope.km);
			var payload = this.envelope.payload;
			var seqnum = this.envelope.seqnum;

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
				("0000000" + cipherobj.sigBytes.toString(16)).substr(-8),
				("0000000" + parseInt(seqnum).toString(16)).substr(-8)
			].join(""));

			var mac = CryptoJS.enc.Hex.stringify(CryptoJS.HmacSHA256(
				header + iv + cipherobj,
				km
			));

			var envelope = header + iv + cipherobj + mac + ke + km + "deadbeef";
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
		}
	},

	mounted: function () {
		this.getMessagesFromDatabase();
	}
});