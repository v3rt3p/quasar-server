import { encodeProtobufStruct } from '../../protobuf'
import proto from '../../protos/protos'

export const ttsSemanticFrame = (text: string) => encodeProtobufStruct({
  typed_semantic_frame: {
    tts_semantic_frame: {
      text
    }
  }
})

export const continueSessionStage1SemanticFrame = encodeProtobufStruct({
  typed_callback_serialized: Buffer.from(proto.google.protobuf.Any.encode({
    typeUrl: 'continueSessionStage1SemanticFrame'
  }).finish()).toString('base64'),
  typed_semantic_frame: {
    continue_session_stage1_semantic_frame: {}
  }
})

export const continueSessionStage2SemanticFrame = (dialogId: null | string) => encodeProtobufStruct({
  typed_semantic_frame: {
    continue_session_stage2_semantic_frame: {
      dialog_id: dialogId
    }
  }
})
