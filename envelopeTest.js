var CryptoJS = require('crypto-js');
var NodeRSA = require('node-rsa');

var rcv_publicKey_pem = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCqDCOej/VatTQz6pi1sER1U1DY
q7SL6ASQE1EuL/pDjDIbY6rrY4O7hiTxjJWQ70BqZjBCyTfjZ5V3CH98ZSHzPFhr
ASy4vsf+X4COt8PzXG0yHWm1iy0BlrQFr73YXhNUtnd9KSQgXX+YxRekgWzbCeqJ
IWUE/RMF0imqix9QmQIDAQAB
-----END PUBLIC KEY-----`;
var rcv_privateKey_pem = `-----BEGIN RSA PRIVATE KEY-----
MIICXAIBAAKBgQCqDCOej/VatTQz6pi1sER1U1DYq7SL6ASQE1EuL/pDjDIbY6rr
Y4O7hiTxjJWQ70BqZjBCyTfjZ5V3CH98ZSHzPFhrASy4vsf+X4COt8PzXG0yHWm1
iy0BlrQFr73YXhNUtnd9KSQgXX+YxRekgWzbCeqJIWUE/RMF0imqix9QmQIDAQAB
AoGAQD/Z7X1DHQS+Nqd7D5sMIrBaKaOm0f3WS4Gg+KyUCJWeEQ81cz7kdSQYLVQK
5vofApSdw343qapnpNQHJz8m9hvt5WC7AutRXQcX95PWJ9bWW+688h7Zpv2w2i3s
jUqUTkaKx8M97gn3kmS4svNz98Pkv2eYN/97/g8cpKZcwMkCQQDmtzEVi7NJ7M7K
ZX3qUMAiEg3zihkQA1097PFmPrC4WNmOAS4zrYP/10vsEcox8iwSRQZxKwXhvH4Z
BUa1pOUPAkEAvK7hUEzupYGBv1vhbxVpzfdI6mg8Jlk94Q9zFRgReFjQxahCsn6E
TI/LXccPgqpknWhQdfaNiC5Wz6GchPf/1wJAOQJXTJ2ihcfQKU7+2CFv+HtBm0Yq
fzx1k9GyrLMc89BwoZhFFFvx3AwVJJYYwlK29SS9PMWGxIrRFdmp6UR/nQJBAIr5
SC2MLK6s3/Mhar8WB5NUE1nMIpmgW6p8ZahgzOVWjZc4Yr/z3eBCfWj6KJt2g5tI
7RKl4gMvFnPiNlXeEIsCQAKtCpBR7GFx6RVpQo8k6qbMCeV90+rO4ntRP9wQhI5N
bvQefp9xU6tFvJPbH6SCE9MbHUrT5AIf1SNrZSp3PmY=
-----END RSA PRIVATE KEY-----`;

var snd_publicKey_pem = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCc48sMvfO63If0bz4W2GenbMV0
+DGqzgA2t33qcbb3lNs/fpf3bj4WDG9nRGZiFYPFLFq5ql7U9I6GY1+RXIrIL7h0
0z2f61UlcaD7iQjxBpRL+KNamSOiUCBHZX25Y6M8enYpR5a5I05qjNUgRAUTAC35
YyBO5dJ7wic/t/blGwIDAQAB
-----END PUBLIC KEY-----`;
var snd_privateKey_pem = `-----BEGIN RSA PRIVATE KEY-----
MIICWQIBAAKBgQCc48sMvfO63If0bz4W2GenbMV0+DGqzgA2t33qcbb3lNs/fpf3
bj4WDG9nRGZiFYPFLFq5ql7U9I6GY1+RXIrIL7h00z2f61UlcaD7iQjxBpRL+KNa
mSOiUCBHZX25Y6M8enYpR5a5I05qjNUgRAUTAC35YyBO5dJ7wic/t/blGwIDAQAB
An9DaZ3V28jegePpI+OJ7XKcfiBaIks1GU7+M9nm4vW7bDrJDZw+tR/4WV+E/97+
RkBYeLaDELGuz2ZuWES4MQtwTFmPxbS5Z2xkoTIumAWC5fa4mXtfMzyukBHSmt6B
PLFXWQqsSSJUhyGKCy8v3jDzjM0kAYPJIK7vFpI/1MyxAkEA2Bruus+e/tb7BfMY
JIbXdBmjziOZfeL0Bm5tqII8SjJNaVzj5iYYER1ZFKIoTutwMo/g13oFhBcKGedP
q/bclwJBALnaW+uWvS1QF63MlMEgHBYHLdY+qD8SaO+CaHWN2fFq7vjvVOje560L
rP1/O1OjXZZWq5y+C2CkByJrXtG0WB0CQH17Nf+XKvVCk0OjIfOjsFsjwC+kEC4+
p/9MA7SC2ssiZjy1yUcL+5GEfwMyHUGmB+H0FVRI8AcA8caUv3hUwUUCQC1BJFzL
Sak89WcWh6o2/V/Hw7uFakZhXzfi0zi8n7MPTL1E2bIShOs4Cpl3X6TQBLvUwtjZ
1b9kcXBKIL6DYWkCQEc8N+uIj86YDiAkpb1jJpfA1yTNXlsX2wy6f++Lq3Kx/MLR
wcCaNMc1rwhoI2+S0F3WOUTGsXj/d/IVxiYLyBk=
-----END RSA PRIVATE KEY-----`;

var iv = "3bbdce68b2736ed96972d56865ad82a2";
var ke = "a891f95cc50bd872e8fcd96cf5030535e273c5210570b3dcfa7946873d167c57";

function generateEnvelope(payload) {
	var seqnum = 0;
	var snd = 1;
	var rcv = 2;
	var cht = 1;

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

	var rcv_pubkey = new NodeRSA();
	rcv_pubkey.importKey(rcv_publicKey_pem, 'public');
	ke = rcv_pubkey.encrypt(ke, 'hex', 'hex');

	var snd_privkey = new NodeRSA();
	snd_privkey.importKey(snd_privateKey_pem, 'private');
	var sigData = header + iv + ciphertext + ke;
	var sig = snd_privkey.sign(sigData, 'hex', 'hex');

	var envelope = header + iv + ciphertext + ke + sig;
	return envelope;
}

var plaintext = "This is a plaintext message!";

var ciphertext = generateEnvelope(plaintext);

console.log(ciphertext);

function parseEnvelope(msg) {
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
		rcv_privkey.importKey(rcv_privateKey_pem, "private");
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
}

var decipherText = parseEnvelope(ciphertext);

console.log(decipherText);