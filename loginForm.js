Vue.component('login-form', {
	data: function () {
		return {
			username: "",
			password: "",
			didSubmitIncorrectCreds: false,
			submitButtonIsDisabled: false,
		}
	},

	methods: {
		resetData: function() {
			NProgress.done();
			this.username = "";
			this.password = "";
			this.submitButtonIsDisabled = false;
			this.didSubmitIncorrectCreds = true;
		},

		startLogin: function() {
			if(this.username == "") {
				this.didSubmitIncorrectCreds = true;
				return;
			}

			if(!this.submitButtonIsDisabled) {
				this.submitButtonIsDisabled = true;
				NProgress.start();

				let key = app.generateNewRsaKeypair(this.password);

				axios({
					method: 'post',
					url: 'login',
					data: {
						"username": this.username,
						"password": this.password,
						"key": key
					}
				}).then((response) => {
					if(response.data.success) {
						this.didSubmitIncorrectCreds = false;
						app.processSuccessfulLoginWithCredentials(response.data.user, this.password);
					} else {
						this.resetData();
					}
				}).catch((error) => {
					this.resetData();
				})
			}
		},

		goToRegistration: function() {
			app.uiState = "register";
		}
	},

	mounted: function() {
		NProgress.configure({ showSpinner: false });
	},

	template: 
	`<div class="login-form">
		<h2>Welcome to PenguinEgg.</h2>
		<p>By <a href="https://jameslittle.me">James Little</a></p>
		<p v-if="didSubmitIncorrectCreds">Your credentials were incorrect. Please try again.</p>
		<input placeholder="Username" v-model="username" autofocus><br>
		<input type="password" placeholder="Password" v-model="password" v-on:keydown.enter="startLogin"><br>
		<button @click="startLogin" v-bind:disabled="this.submitButtonIsDisabled">{{ submitButtonIsDisabled ? "Loading..." : "Log in" }}</button><br>
		<p>Or <a href="#" @click.prevent.stop.once="goToRegistration">register</a></p>
	</div>`
})