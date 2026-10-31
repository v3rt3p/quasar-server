import protos from './protos/protos'

console.info(protos.NAlice.NAliceApi.TClientMessage.fromObject({
  event: {
    text_input: {}
  }
}).toJSON())
