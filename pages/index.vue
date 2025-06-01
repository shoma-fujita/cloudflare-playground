<script setup lang="ts">

const body = {
  from: 'あなたの名前',
  fromMemberId: 'あなたのメンバーID',
  to: '感謝を伝えたい相手の名前',
  toMemberIds: '感謝を伝えたい相手のメンバーID',
  message: '感謝のメッセージ',
}

const submit = async () => {
  await fetch('/api/googleSpreadSheets/add', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}
</script>

<template>
  <div>
      <h1>ありがとうを伝える</h1>
      <button @click="submit">
        ありがとうを伝える
      </button>
  </div>
</template>
