export interface ITransferTokenAuth {
  type: 'token'; // the name of the auth strategy
  token: string; // the transfer token
}
