# Controllers

Different controllers (in the sense of *VC *View-Controller).
# MOAC
cancel infura service to send transactions.
use sendRawTransaction from chain3 to replace.

TransactionController
Used the KeyringController to sign the TX
this.keyringController.signTransaction.bind(this.keyringController),
Need to modify the KeyringController to enable the MOAC keyring

keyringController => eth-simple-keyring =>