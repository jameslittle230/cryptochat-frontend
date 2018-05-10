Vue.component('message', {
  props: ['message'],
  data: function () {
    return {
      username: "",
      password: "",
      didSubmitIncorrectCreds: false,
    }
  },

  template: 
  `<div class="">{{message.content}}</div>`
})