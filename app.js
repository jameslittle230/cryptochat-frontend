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

		messages: [
			"This is a message",
			"It has some text"
		]
	},

	methods: {
		sendMessage: function(e) {
			e.preventDefault();
			socket.emit('msg', this.messageInput)
			this.messageInput = "";
			return;
		},

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

			var envelope = header + " " + iv + " " + cipherobj + " " + mac + " " + ke + " " + km + " " + "DEADBEEF";
			console.log(envelope);
			socket.emit('msg', envelope);
		}
	}
});

if(io in window) {
	app.connectionWarning = true;
}

var socket = io('http://localhost:8080/');

socket.on('msg', function(msg){
	app.messages.push(msg);
});