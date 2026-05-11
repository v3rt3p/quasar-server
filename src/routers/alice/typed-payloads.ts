import { encodeProtobufStruct } from '../../protobuf'

export const externalEventSemanticFrame = (event: string) => encodeProtobufStruct({
  typed_semantic_frame: {
    external_event_semantic_frame: {
      event
    }
  }
})

export const ttsSemanticFrame = (text: string) => encodeProtobufStruct({
  typed_semantic_frame: {
    tts_semantic_frame: {
      text
    }
  }
})

export const continueSessionStage1SemanticFrame = encodeProtobufStruct({
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
