export const externalEventSemanticFrame = (text: string) => (
  {
    fields: {
      typed_semantic_frame: {
        structValue: {
          fields: {
            external_event_semantic_frame: {
              structValue: {
                fields: {
                  event: {
                    stringValue: text
                  }
                }
              }
            }
          }
        }
      }
    }
  }
)

export const ttsSemanticFrame = (text: string) => (
  {
    fields: {
      typed_semantic_frame: {
        structValue: {
          fields: {
            tts_semantic_frame: {
              structValue: {
                fields: {
                  text: {
                    stringValue: text
                  }
                }
              }
            }
          }
        }
      }
    }
  }
)

export const continueSessionStage1SemanticFrame = {
  fields: {
    typed_semantic_frame: {
      structValue: {
        fields: {
          continue_session_stage1_semantic_frame: {
            structValue: {
              fields: {}
            }
          }
        }
      }
    }
  }
}

export const continueSessionStage2SemanticFrame = {
  fields: {
    typed_semantic_frame: {
      structValue: {
        fields: {
          continue_session_stage2_semantic_frame: {
            structValue: {
              fields: {}
            }
          }
        }
      }
    }
  }
}
