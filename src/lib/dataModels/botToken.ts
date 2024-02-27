/*
 *
 * name: string
 * publicWalletAddress: string
 * tokens: Int32
 *
 */
export const BOT_TOKEN_DOCUMENT_NAME = 'botToken';

export interface BotToken {
  id: string;
  name: string;
  publicWalletAddress: string;
  tokens: number;
}
