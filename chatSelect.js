Vue.component('chat-select', {
  props: ['chat'],
  data: function () {
    return {
      app: app,
    }
  },

  methods: {
    selectChat() {
      app.selectedChat = this.chat.chat_id
    }
  },

  template: 
  `<div class="chat-select" v-on:click="selectChat">
    {{ chat.members.filter(m => m.user_id != app.currentUser.user_id).map(m => m.first_name + " " + m.last_name).join(", ") }}
  </div>`
})