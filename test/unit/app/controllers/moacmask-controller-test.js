const assert = require('assert')
const sinon = require('sinon')
const clone = require('clone')
const nock = require('nock')
const createThoughStream = require('through2').obj
const MoacMaskController = require('../../../../app/scripts/moacmask-controller')
const blacklistJSON = require('eth-phishing-detect/src/config')
const firstTimeState = require('../../../../app/scripts/first-time-state')

const currentNetworkId = 42
const DEFAULT_LABEL = 'Account 1'
const TEST_SEED = 'debris dizzy just program just float decrease vacant alarm reduce speak stadium'
const TEST_ADDRESS = '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc'
const TEST_SEED_ALT = 'setup olympic issue mobile velvet surge alcohol burger horse view reopen gentle'
const TEST_ADDRESS_ALT = '0xc42edfcc21ed14dda456aa0756c153f7985d8813'

describe('MoacMaskController', function () {
  let moacmaskController
  const sandbox = sinon.createSandbox()
  const noop = () => {}

  beforeEach(function () {

    nock('https://api.infura.io')
      .persist()
      .get('/v2/blacklist')
      .reply(200, blacklistJSON)

    nock('https://api.infura.io')
      .get('/v1/ticker/ethusd')
      .reply(200, '{"base": "ETH", "quote": "USD", "bid": 288.45, "ask": 288.46, "volume": 112888.17569277, "exchange": "bitfinex", "total_volume": 272175.00106721005, "num_exchanges": 8, "timestamp": 1506444677}')

    nock('https://api.infura.io')
      .get('/v1/ticker/ethjpy')
      .reply(200, '{"base": "ETH", "quote": "JPY", "bid": 32300.0, "ask": 32400.0, "volume": 247.4616071, "exchange": "kraken", "total_volume": 247.4616071, "num_exchanges": 1, "timestamp": 1506444676}')

    nock('https://api.infura.io')
      .persist()
      .get(/.*/)
      .reply(200)

    moacmaskController = new MoacMaskController({
      showUnapprovedTx: noop,
      showUnconfirmedMessage: noop,
      encryptor: {
        encrypt: function (password, object) {
          this.object = object
          return Promise.resolve('mock-encrypted')
        },
        decrypt: function () {
          return Promise.resolve(this.object)
        },
      },
      initState: clone(firstTimeState),
    })
    // disable diagnostics
    moacmaskController.diagnostics = null
    // add sinon method spies
    sandbox.spy(moacmaskController.keyringController, 'createNewVaultAndKeychain')
    sandbox.spy(moacmaskController.keyringController, 'createNewVaultAndRestore')
  })

  afterEach(function () {
    nock.cleanAll()
    sandbox.restore()
  })

  describe('submitPassword', function () {
    const password = 'password'

    beforeEach(async function () {
      await moacmaskController.createNewVaultAndKeychain(password)
    })

    it('removes any identities that do not correspond to known accounts.', async function () {
      const fakeAddress = '0xbad0'
      moacmaskController.preferencesController.addAddresses([fakeAddress])
      await moacmaskController.submitPassword(password)

      const identities = Object.keys(moacmaskController.preferencesController.store.getState().identities)
      const addresses = await moacmaskController.keyringController.getAccounts()

      identities.forEach((identity) => {
        assert.ok(addresses.includes(identity), `addresses should include all IDs: ${identity}`)
      })

      addresses.forEach((address) => {
        assert.ok(identities.includes(address), `identities should include all Addresses: ${address}`)
      })
    })
  })

  describe('#getGasPrice', function () {

    it('gives the 50th percentile lowest accepted gas price from recentBlocksController', async function () {
      const realRecentBlocksController = moacmaskController.recentBlocksController
      moacmaskController.recentBlocksController = {
        store: {
          getState: () => {
            return {
              recentBlocks: [
                { gasPrices: [ '0x3b9aca00', '0x174876e800'] },
                { gasPrices: [ '0x3b9aca00', '0x174876e800'] },
                { gasPrices: [ '0x174876e800', '0x174876e800' ]},
                { gasPrices: [ '0x174876e800', '0x174876e800' ]},
              ],
            }
          },
        },
      }

      const gasPrice = moacmaskController.getGasPrice()
      assert.equal(gasPrice, '0x3b9aca00', 'accurately estimates 50th percentile accepted gas price')

      moacmaskController.recentBlocksController = realRecentBlocksController
    })
  })

  describe('#createNewVaultAndKeychain', function () {
    it('can only create new vault on keyringController once', async function () {
      const selectStub = sandbox.stub(moacmaskController, 'selectFirstIdentity')

      const password = 'a-fake-password'

      await moacmaskController.createNewVaultAndKeychain(password)
      await moacmaskController.createNewVaultAndKeychain(password)

      assert(moacmaskController.keyringController.createNewVaultAndKeychain.calledOnce)

      selectStub.reset()
    })
  })

  describe('#createNewVaultAndRestore', function () {
    it('should be able to call newVaultAndRestore despite a mistake.', async function () {
      const password = 'what-what-what'
      await moacmaskController.createNewVaultAndRestore(password, TEST_SEED.slice(0, -1)).catch((e) => null)
      await moacmaskController.createNewVaultAndRestore(password, TEST_SEED)

      assert(moacmaskController.keyringController.createNewVaultAndRestore.calledTwice)
    })

    it('should clear previous identities after vault restoration', async () => {
      await moacmaskController.createNewVaultAndRestore('foobar1337', TEST_SEED)
      assert.deepEqual(moacmaskController.getState().identities, {
        [TEST_ADDRESS]: { address: TEST_ADDRESS, name: DEFAULT_LABEL },
      })

      await moacmaskController.preferencesController.setAccountLabel(TEST_ADDRESS, 'Account Foo')
      assert.deepEqual(moacmaskController.getState().identities, {
        [TEST_ADDRESS]: { address: TEST_ADDRESS, name: 'Account Foo' },
      })

      await moacmaskController.createNewVaultAndRestore('foobar1337', TEST_SEED_ALT)
      assert.deepEqual(moacmaskController.getState().identities, {
        [TEST_ADDRESS_ALT]: { address: TEST_ADDRESS_ALT, name: DEFAULT_LABEL },
      })
    })
  })

  describe('#getApi', function () {
    let getApi, state

    beforeEach(function () {
      getApi = moacmaskController.getApi()
    })

    it('getState', function (done) {
      getApi.getState((err, res) => {
        if (err) {
          done(err)
        } else {
          state = res
        }
      })
      assert.deepEqual(state, moacmaskController.getState())
      done()
    })

  })

  describe('preferencesController', function () {

    it('defaults useBlockie to false', function () {
      assert.equal(moacmaskController.preferencesController.store.getState().useBlockie, false)
    })

    it('setUseBlockie to true', function () {
      moacmaskController.setUseBlockie(true, noop)
      assert.equal(moacmaskController.preferencesController.store.getState().useBlockie, true)
    })

  })

  describe('#selectFirstIdentity', function () {
    let identities, address

    beforeEach(function () {
      address = '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc'
      identities = {
        '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc': {
          'address': address,
          'name': 'Account 1',
        },
        '0xc42edfcc21ed14dda456aa0756c153f7985d8813': {
          'address': '0xc42edfcc21ed14dda456aa0756c153f7985d8813',
          'name': 'Account 2',
        },
      }
      moacmaskController.preferencesController.store.updateState({ identities })
      moacmaskController.selectFirstIdentity()
    })

    it('changes preferences controller select address', function () {
      const preferenceControllerState = moacmaskController.preferencesController.store.getState()
      assert.equal(preferenceControllerState.selectedAddress, address)
    })

    it('changes metamask controller selected address', function () {
      const metamaskState = moacmaskController.getState()
      assert.equal(metamaskState.selectedAddress, address)
    })
  })

  describe('#setCustomRpc', function () {
    const customRPC = 'https://custom.rpc/'
    let rpcTarget

    beforeEach(function () {

      nock('https://custom.rpc')
      .post('/')
      .reply(200)

      rpcTarget = moacmaskController.setCustomRpc(customRPC)
    })

    afterEach(function () {
      nock.cleanAll()
    })

    it('returns custom RPC that when called', async function () {
      assert.equal(await rpcTarget, customRPC)
    })

    it('changes the network controller rpc', function () {
      const networkControllerState = moacmaskController.networkController.store.getState()
      assert.equal(networkControllerState.provider.rpcTarget, customRPC)
    })
  })

  describe('#setCurrentCurrency', function () {
    let defaultMetaMaskCurrency

    beforeEach(function () {
      defaultMetaMaskCurrency = moacmaskController.currencyController.getCurrentCurrency()
    })

    it('defaults to usd', function () {
      assert.equal(defaultMetaMaskCurrency, 'usd')
    })

    it('sets currency to JPY', function () {
      moacmaskController.setCurrentCurrency('JPY', noop)
      assert.equal(moacmaskController.currencyController.getCurrentCurrency(), 'JPY')
    })
  })

  describe('#createShapeshifttx', function () {
    let depositAddress, depositType, shapeShiftTxList

    beforeEach(function () {
      nock('https://shapeshift.io')
        .get('/txStat/3EevLFfB4H4XMWQwYCgjLie1qCAGpd2WBc')
        .reply(200, '{"status": "no_deposits", "address": "3EevLFfB4H4XMWQwYCgjLie1qCAGpd2WBc"}')

      depositAddress = '3EevLFfB4H4XMWQwYCgjLie1qCAGpd2WBc'
      depositType = 'ETH'
      shapeShiftTxList = moacmaskController.shapeshiftController.store.getState().shapeShiftTxList
    })

    it('creates a shapeshift tx', async function () {
      moacmaskController.createShapeShiftTx(depositAddress, depositType)
      assert.equal(shapeShiftTxList[0].depositAddress, depositAddress)
    })

  })

  describe('#addNewAccount', function () {
    let addNewAccount

    beforeEach(function () {
      addNewAccount = moacmaskController.addNewAccount()
    })

    it('errors when an primary keyring is does not exist', async function () {
      try {
        await addNewAccount
        assert.equal(1 === 0)
      } catch (e) {
        assert.equal(e.message, 'MoacMaskController - No HD Key Tree found')
      }
    })
  })

  describe('#verifyseedPhrase', function () {
    let seedPhrase, getConfigSeed

    it('errors when no keying is provided', async function () {
      try {
        await moacmaskController.verifySeedPhrase()
      } catch (error) {
        assert.equal(error.message, 'MoacMaskController - No HD Key Tree found')
      }
    })

    beforeEach(async function () {
      await moacmaskController.createNewVaultAndKeychain('password')
      seedPhrase = await moacmaskController.verifySeedPhrase()
    })

    it('#placeSeedWords should match the initially created vault seed', function () {

      moacmaskController.placeSeedWords((err, result) => {
        if (err) {
         console.log(err)
        } else {
          getConfigSeed = moacmaskController.configManager.getSeedWords()
          assert.equal(result, seedPhrase)
          assert.equal(result, getConfigSeed)
        }
      })
      assert.equal(getConfigSeed, undefined)
    })

    it('#addNewAccount', async function () {
      await moacmaskController.addNewAccount()
      const getAccounts = await moacmaskController.keyringController.getAccounts()
      assert.equal(getAccounts.length, 2)
    })
  })

  describe('#resetAccount', function () {

    beforeEach(function () {
      const selectedAddressStub = sinon.stub(moacmaskController.preferencesController, 'getSelectedAddress')
      const getNetworkstub = sinon.stub(moacmaskController.txController.txStateManager, 'getNetwork')

      selectedAddressStub.returns('0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc')
      getNetworkstub.returns(42)

      moacmaskController.txController.txStateManager._saveTxList([
        { id: 1, status: 'unapproved', metamaskNetworkId: currentNetworkId, txParams: {from: '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc'} },
        { id: 2, status: 'rejected', metamaskNetworkId: 32, txParams: {} },
        { id: 3, status: 'submitted', metamaskNetworkId: currentNetworkId, txParams: {from: '0xB09d8505E1F4EF1CeA089D47094f5DD3464083d4'} },
      ])
    })

    it('wipes transactions from only the correct network id and with the selected address', async function () {
      await moacmaskController.resetAccount()
      assert.equal(moacmaskController.txController.txStateManager.getTx(1), undefined)
    })
  })

  describe('#clearSeedWordCache', function () {

    it('should have set seed words', function () {
      moacmaskController.configManager.setSeedWords('test words')
      const getConfigSeed = moacmaskController.configManager.getSeedWords()
      assert.equal(getConfigSeed, 'test words')
    })

    it('should clear config seed phrase', function () {
      moacmaskController.configManager.setSeedWords('test words')
      moacmaskController.clearSeedWordCache((err, result) => {
        if (err) console.log(err)
      })
      const getConfigSeed = moacmaskController.configManager.getSeedWords()
      assert.equal(getConfigSeed, null)
    })

  })

  describe('#setCurrentLocale', function () {

    it('checks the default currentLocale', function () {
      const preferenceCurrentLocale = moacmaskController.preferencesController.store.getState().currentLocale
      assert.equal(preferenceCurrentLocale, undefined)
    })

    it('sets current locale in preferences controller', function () {
      moacmaskController.setCurrentLocale('ja', noop)
      const preferenceCurrentLocale = moacmaskController.preferencesController.store.getState().currentLocale
      assert.equal(preferenceCurrentLocale, 'ja')
    })

  })

  describe('#newUnsignedMessage', function () {

    let msgParams, metamaskMsgs, messages, msgId

    const address = '0xc42edfcc21ed14dda456aa0756c153f7985d8813'
    const data = '0x43727970746f6b697474696573'

    beforeEach(async function () {

      await moacmaskController.createNewVaultAndRestore('foobar1337', TEST_SEED_ALT)

      msgParams = {
        'from': address,
        'data': data,
      }

      moacmaskController.newUnsignedMessage(msgParams, noop)
      metamaskMsgs = moacmaskController.messageManager.getUnapprovedMsgs()
      messages = moacmaskController.messageManager.messages
      msgId = Object.keys(metamaskMsgs)[0]
      messages[0].msgParams.metamaskId = parseInt(msgId)
    })

    it('persists address from msg params', function () {
      assert.equal(metamaskMsgs[msgId].msgParams.from, address)
    })

    it('persists data from msg params', function () {
      assert.equal(metamaskMsgs[msgId].msgParams.data, data)
    })

    it('sets the status to unapproved', function () {
      assert.equal(metamaskMsgs[msgId].status, 'unapproved')
    })

    it('sets the type to eth_sign', function () {
      assert.equal(metamaskMsgs[msgId].type, 'eth_sign')
    })

    it('rejects the message', function () {
      const msgIdInt = parseInt(msgId)
      moacmaskController.cancelMessage(msgIdInt, noop)
      assert.equal(messages[0].status, 'rejected')
    })

    it('errors when signing a message', async function () {
      try {
        await moacmaskController.signMessage(messages[0].msgParams)
      } catch (error) {
        assert.equal(error.message, 'message length is invalid')
      }
    })
  })

  describe('#newUnsignedPersonalMessage', function () {

    it('errors with no from in msgParams', function () {
      const msgParams = {
        'data': data,
      }
      moacmaskController.newUnsignedPersonalMessage(msgParams, function (error) {
        assert.equal(error.message, 'MetaMask Message Signature: from field is required.')
      })
    })

    let msgParams, metamaskPersonalMsgs, personalMessages, msgId

    const address = '0xc42edfcc21ed14dda456aa0756c153f7985d8813'
    const data = '0x43727970746f6b697474696573'

    beforeEach(async function () {

      await moacmaskController.createNewVaultAndRestore('foobar1337', TEST_SEED_ALT)

      msgParams = {
        'from': address,
        'data': data,
      }

      moacmaskController.newUnsignedPersonalMessage(msgParams, noop)
      metamaskPersonalMsgs = moacmaskController.personalMessageManager.getUnapprovedMsgs()
      personalMessages = moacmaskController.personalMessageManager.messages
      msgId = Object.keys(metamaskPersonalMsgs)[0]
      personalMessages[0].msgParams.metamaskId = parseInt(msgId)
    })

    it('persists address from msg params', function () {
      assert.equal(metamaskPersonalMsgs[msgId].msgParams.from, address)
    })

    it('persists data from msg params', function () {
      assert.equal(metamaskPersonalMsgs[msgId].msgParams.data, data)
    })

    it('sets the status to unapproved', function () {
      assert.equal(metamaskPersonalMsgs[msgId].status, 'unapproved')
    })

    it('sets the type to personal_sign', function () {
      assert.equal(metamaskPersonalMsgs[msgId].type, 'personal_sign')
    })

    it('rejects the message', function () {
      const msgIdInt = parseInt(msgId)
      moacmaskController.cancelPersonalMessage(msgIdInt, noop)
      assert.equal(personalMessages[0].status, 'rejected')
    })

    it('errors when signing a message', async function () {
      await moacmaskController.signPersonalMessage(personalMessages[0].msgParams)
      assert.equal(metamaskPersonalMsgs[msgId].status, 'signed')
      assert.equal(metamaskPersonalMsgs[msgId].rawSig, '0x6a1b65e2b8ed53cf398a769fad24738f9fbe29841fe6854e226953542c4b6a173473cb152b6b1ae5f06d601d45dd699a129b0a8ca84e78b423031db5baa734741b')
    })
  })

  describe('#setupUntrustedCommunication', function () {
    let streamTest

    const phishingUrl = 'decentral.market'

    afterEach(function () {
      streamTest.end()
    })

    it('sets up phishing stream for untrusted communication ', async function () {
      await moacmaskController.blacklistController.updatePhishingList()

      streamTest = createThoughStream((chunk, enc, cb) => {
        assert.equal(chunk.name, 'phishing')
        assert.equal(chunk.data.hostname, phishingUrl)
         cb()
        })
      // console.log(streamTest)
       moacmaskController.setupUntrustedCommunication(streamTest, phishingUrl)
    })
  })

  describe('#setupTrustedCommunication', function () {
    let streamTest

    afterEach(function () {
      streamTest.end()
    })

    it('sets up controller dnode api for trusted communication', function (done) {
      streamTest = createThoughStream((chunk, enc, cb) => {
        assert.equal(chunk.name, 'controller')
        cb()
        done()
      })

      moacmaskController.setupTrustedCommunication(streamTest, 'mycrypto.com')
    })
  })

  describe('#markAccountsFound', function () {
    it('adds lost accounts to config manager data', function () {
      moacmaskController.markAccountsFound(noop)
      const configManagerData = moacmaskController.configManager.getData()
      assert.deepEqual(configManagerData.lostAccounts, [])
    })
  })

  describe('#markPasswordForgotten', function () {
    it('adds and sets forgottenPassword to config data to true', function () {
      moacmaskController.markPasswordForgotten(noop)
      const configManagerData = moacmaskController.configManager.getData()
      assert.equal(configManagerData.forgottenPassword, true)
    })
  })

  describe('#unMarkPasswordForgotten', function () {
    it('adds and sets forgottenPassword to config data to false', function () {
      moacmaskController.unMarkPasswordForgotten(noop)
      const configManagerData = moacmaskController.configManager.getData()
      assert.equal(configManagerData.forgottenPassword, false)
    })
  })

})
