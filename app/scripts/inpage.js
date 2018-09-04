/*global Web3*/
cleanContextForImports()
require('web3/dist/web3.min.js')
const log = require('loglevel')
const LocalMessageDuplexStream = require('post-message-stream')
const setupDappAutoReload = require('./lib/auto-reload.js')
const MetamaskInpageProvider = require('./lib/inpage-provider.js')
restoreContextAfterImports()

log.setDefaultLevel(process.env.METAMASK_DEBUG ? 'debug' : 'warn')

//
// setup plugin communication
//
//Should update to Chain3 but not yet, 2018/06/22
// setup background connection
var metamaskStream = new LocalMessageDuplexStream({
  name: 'inpage',
  target: 'contentscript',
})

// compose the inpage provider
var inpageProvider = new MetamaskInpageProvider(metamaskStream)

//
// setup web3
//

if (typeof window.web3 !== 'undefined') {
  throw new Error(`MoacMask detected another web3.
  MoacMask will not work reliably with another web3 extension.
     This usually happens if you have two MoacMasks installed,
     or MoacMask and another web3 extension. Please remove one
     and try again.`)
}
var web3 = new Web3(inpageProvider)
web3.setProvider = function () {
  log.debug('MoacMask - overrode web3.setProvider')
}
log.debug('MoacMask - injected web3')
// export global web3, with usage-detection
setupDappAutoReload(web3, inpageProvider.publicConfigStore)

// set web3 defaultAccount
inpageProvider.publicConfigStore.subscribe(function (state) {
  web3.eth.defaultAccount = state.selectedAddress
})

// need to make sure we aren't affected by overlapping namespaces
// and that we dont affect the app with our namespace
// mostly a fix for web3's BigNumber if AMD's "define" is defined...
var __define

/**
 * Caches reference to global define object and deletes it to
 * avoid conflicts with other global define objects, such as
 * AMD's define function
 */
function cleanContextForImports () {
  __define = global.define
  try {
    global.define = undefined
  } catch (_) {
    console.warn('MoacMask - global.define could not be deleted.')
  }
}

/**
 * Restores global define object from cached reference
 */
function restoreContextAfterImports () {
  try {
    global.define = __define
  } catch (_) {
    console.warn('MoacMask - global.define could not be overwritten.')
  }
}
