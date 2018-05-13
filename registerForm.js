Vue.component('register-form', {
	data: function () {
		return {
			username: "",
			password: "",
			password2: "",
			first: "",
			last: "",
			didSubmitIncorrectCreds: false,
			submitButtonIsDisabled: false,
			errorReason: "",
			possibleErrors: {
				username: "Username already exists. You should pick another one.",
				password: "Look, this whole thing is about encryption. You need a strong password.",
				passwordMatch: "Your passwords have to match.",
				name: "You can't leave your first or last name blank (but tbh they don't need to be your real name either"
			}
		}
	},

	methods: {
		startLogin: function() {
			if(this.username == "") {
				this.didSubmitIncorrectCreds = true;
				this.errorReason = "username";
				return;
			}

			if(this.password != this.password2) {
				this.didSubmitIncorrectCreds = true;
				this.errorReason = "passwordMatch";
			}

			NProgress.configure({ showSpinner: false });

			var me = this;

			if(!this.submitButtonIsDisabled) {
				this.submitButtonIsDisabled = true;
				NProgress.start();

				let key = app.generateNewRsaKeypair(this.password);

				axios({
					method: 'post',
					url: 'register',
					data: {
						"username": this.username,
						"password": this.password,
						"first": this.first,
						"last": this.last,
						"key": key
					}
				}).then(function(response) {
					if(response.data.success) {
						me.didSubmitIncorrectCreds = false;
						app.processSuccessfulLoginWithCredentials(response.data.user, me.password);
					} else {
						NProgress.done();
						me.username = "";
						me.password = "";
						me.password2 = "";
						me.first = "";
						me.last = "";
						me.didSubmitIncorrectCreds = true;
						me.errorReason = response.data.errorReason;
					}
				}).catch(function(error) {
					NProgress.done();
					me.username = "";
					me.password = "";
					me.password2 = "";
					me.first = "";
					me.last = "";
					me.submitButtonIsDisabled = false;
					me.didSubmitIncorrectCreds = true;
					me.errorReason = response.data.errorReason;
				})
			}
		},

		goToLogin: function() {
			app.uiState = 'login';
		}
	},

	template: 
	`<div class="login-form">
		<h2>Make an account!</h2>
		<p v-if="didSubmitIncorrectCreds">{{ possibleErrors[errorReason] }}</p>
		<input placeholder="Username" v-model="username" autofocus><br>
		<input type="password" placeholder="Password" v-model="password"><br>
		<input type="password" placeholder="Password (again)" v-model="password2" /><br>
		<input type="text" v-model="first" placeholder="First Name"><br>
		<input type="text" v-model="last" placeholder="Last Name"><br>
		<button @click="startLogin" v-bind:disabled="this.submitButtonIsDisabled">{{ submitButtonIsDisabled ? "Loading..." : "Create Account" }}</button><br>
		<p>Already have an account? <a href="#" @click.prevent.stop.once="goToLogin">Log in</a></p>
	</div>`
})