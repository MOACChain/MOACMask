#!/bin/bash
#Update the necessary libs to debug the moac metamask
echo "cp ./moac-keyring/index.js ./metamask-extension/node_modules/moac-keyring/"
cp ../moac-keyring/index.js ./node_modules/moac-keyring/
echo "cp ./KeyringController/index.js ./metamask-extension/node_modules/KeyringController/"
cp ../KeyringController/* ./node_modules/KeyringController/
