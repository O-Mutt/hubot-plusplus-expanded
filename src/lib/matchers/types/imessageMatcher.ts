import { MessageToMatch } from "./messageToMatch";

export abstract const IMessageMatcher<T> = (msg: MessageToMatch): T | null => ();
