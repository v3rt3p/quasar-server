import { randomUUID } from "crypto";
import { loadProto } from "../../proto";

const TProcessIncomingCallDirective = loadProto(
    "alice/protos/endpoint/capabilities/phone_calls/capability.proto")
    .lookupType("NAlice.TPhoneCallsCapability.TProcessIncomingCallDirective")

export interface soundSetLevelDirective {
    type: "soundSetLevel";
    newLevel: number;
}

export interface soundQuieterDirective {
    type: "soundQuieter";
}

export interface SoundLouderDirective {
    type: "soundLouder";
}

export interface ProcessIncomingCallDirective {
    type: "processIncomingCall"
    callId: string;
}

export type AliceDirective = soundSetLevelDirective | soundQuieterDirective | SoundLouderDirective | ProcessIncomingCallDirective;

export const soundLouderDirective = {
    Type: "client_action",
    Name: "sound_louder",
    AnalyticsType: "sound_louder",
    Payload: {},
    IsLedSilent: true
};

export const soundQuieterDirective = {
    Type: "client_action",
    Name: "sound_quiter",
    AnalyticsType: "sound_quiter",
    Payload: {},
    IsLedSilent: true
};

export const soundSetLevelDirective = (level: number) => ({
    Type: "client_action",
    Name: "sound_set_level",
    AnalyticsType: "sound_set_level",
    Payload: {
        fields: {
            new_level: {
                numberValue: level
            },
            new_percent_level: {
                numberValue: level * 10
            }
        }
    },
    IsLedSilent: true
})

export const processIncomingCallDirective = (callId: string) => ({
    Type: "client_action",
    Name: "phone_calls_process_incoming_call",
    IsLedSilent: true,
    PayloadRaw: Buffer.from(TProcessIncomingCallDirective.encode({
        CallId: callId
    }).finish()).toString('base64')
})

export const pushUpdateConfigDirective = {
    Type: "client_action",
    Name: "push_update_config"
}

export function convertToAliceResponseDirective(directive: AliceDirective): any {
    switch (directive.type) {
        case "soundSetLevel":
            return soundSetLevelDirective(directive.newLevel)
        case "soundLouder":
            return soundLouderDirective
        case "soundQuieter":
            return soundQuieterDirective
        case "processIncomingCall": {
            return processIncomingCallDirective(directive.callId)
        }
    }
}