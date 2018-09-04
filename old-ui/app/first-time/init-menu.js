const inherits = require('util').inherits
const EventEmitter = require('events').EventEmitter
const Component = require('react').Component
const connect = require('react-redux').connect
const h = require('react-hyperscript')
const Mascot = require('../components/mascot')
const actions = require('../../../ui/app/actions')
const Tooltip = require('../components/tooltip')
const getCaretCoordinates = require('textarea-caret')

module.exports = connect(mapStateToProps)(InitializeMenuScreen)

inherits(InitializeMenuScreen, Component)
function InitializeMenuScreen () {
  Component.call(this)
  this.animationEventEmitter = new EventEmitter()
}

function mapStateToProps (state) {
  return {
    // state from plugin
    currentView: state.appState.currentView,
    warning: state.appState.warning,
  }
}

InitializeMenuScreen.prototype.render = function () {
  var state = this.props

  switch (state.currentView.name) {

    default:
      return this.renderMenu(state)

  }
}

// InitializeMenuScreen.prototype.componentDidMount = function(){
//   document.getElementById('password-box').focus()
// }

InitializeMenuScreen.prototype.renderMenu = function (state) {
  return (

    h('.initialize-screen.flex-column.flex-center.flex-grow', [

      h('img', {
        src: 'https://lh3.googleusercontent.com/3hWM-FU9nnRvc8yqJ1c_dbljAFMnPtRuhQyUJyXvDTrn9ifLmUhe6H8IQXb8MzZ1O4MRteQCAFcHfxJUKtZMBzp51sOzb_bMIIIiYiruR8Ib93NzJkG9APrYx9nytnFDjO38ac2hM60q4ExLtkHSzc5YQzuapF_n9zrb93qdP-3QUSvchmTMwZMea0NsAJHGDRhtOokfh603br5aHGnUPcYX0-gmtyf6ROKyQ9fiXXzsYYixuAcieZVb4IiyT3yf-HM2FpEIY53eqNnP1aOcKrFVO7vd3AkyWP4haBoeUu0Y62BbL8gauzsnii5_6X4AOZ1Nq2V6HNq-UJAw4Wqr3B1uRGacCNh7vy7TxLEgBzKMWV7hmUk0Yf0Rv9K6IWIE2fXlXEe8NjtruT_vlutPQPuvUlziWWJ6zrNyVdSscfsS3PU0BavL7-jXe6DtdCMQLR7bijnZ_B9mivUOxOxbyQ02t3945c9396V4A2cQFZ0SwWiQ-I1M-op2JC94kKsXgb5D_LjLc7L5z22Pwc09JIQ9pdqoJBahfFF9CxkQvA53wx4ayqagHTU10v6U8h0obaHGDXCuX9mOY4l_ZwmUvEMvQFABkm0Wb5gcuZNQ7XEpz5MJlvLmW7wdFnB4Gg=s512-no',
        style: {
          width: '300px',
          maxWidth: '90%',
        },
      }),
      
      h('h1', {
        style: {
          fontSize: '1.3em',
          textTransform: 'uppercase',
          color: '#7F8082',
          marginBottom: 10,
        },
      }, 'MoacMask'),


      h('div', [
        h('h3', {
          style: {
            fontSize: '0.8em',
            color: '#7F8082',
            display: 'inline',
          },
        }, 'Encrypt your new DEN'),

        h(Tooltip, {
          title: 'Your DEN is your password-encrypted storage within MoacMask.',
        }, [
          h('i.fa.fa-question-circle.pointer', {
            style: {
              fontSize: '18px',
              position: 'relative',
              color: 'rgb(247, 134, 28)',
              top: '2px',
              marginLeft: '4px',
            },
          }),
        ]),
      ]),

      h('span.in-progress-notification', state.warning),

      // password
      h('input.large-input.letter-spacey', {
        type: 'password',
        id: 'password-box',
        placeholder: 'New Password (min 8 chars)',
        onInput: this.inputChanged.bind(this),
        style: {
          width: 260,
          marginTop: 12,
        },
      }),

      // confirm password
      h('input.large-input.letter-spacey', {
        type: 'password',
        id: 'password-box-confirm',
        placeholder: 'Confirm Password',
        onKeyPress: this.createVaultOnEnter.bind(this),
        onInput: this.inputChanged.bind(this),
        style: {
          width: 260,
          marginTop: 16,
        },
      }),


      h('button.primary', {
        onClick: this.createNewVaultAndKeychain.bind(this),
        style: {
          margin: 12,
        },
      }, 'Create'),

      h('.flex-row.flex-center.flex-grow', [
        h('p.pointer', {
          onClick: this.showRestoreVault.bind(this),
          style: {
            fontSize: '0.8em',
            color: 'rgb(247, 134, 28)',
            textDecoration: 'underline',
          },
        }, 'Import Existing DEN'),
      ]),

    ])
  )
}

InitializeMenuScreen.prototype.createVaultOnEnter = function (event) {
  if (event.key === 'Enter') {
    event.preventDefault()
    this.createNewVaultAndKeychain()
  }
}

InitializeMenuScreen.prototype.componentDidMount = function () {
  document.getElementById('password-box').focus()
}

InitializeMenuScreen.prototype.showRestoreVault = function () {
  this.props.dispatch(actions.showRestoreVault())
}

InitializeMenuScreen.prototype.createNewVaultAndKeychain = function () {
  var passwordBox = document.getElementById('password-box')
  var password = passwordBox.value
  var passwordConfirmBox = document.getElementById('password-box-confirm')
  var passwordConfirm = passwordConfirmBox.value

  if (password.length < 8) {
    this.warning = 'password not long enough'
    this.props.dispatch(actions.displayWarning(this.warning))
    return
  }
  if (password !== passwordConfirm) {
    this.warning = 'passwords don\'t match'
    this.props.dispatch(actions.displayWarning(this.warning))
    return
  }

  this.props.dispatch(actions.createNewVaultAndKeychain(password))
}

InitializeMenuScreen.prototype.inputChanged = function (event) {
  // tell mascot to look at page action
  var element = event.target
  var boundingRect = element.getBoundingClientRect()
  var coordinates = getCaretCoordinates(element, element.selectionEnd)
  this.animationEventEmitter.emit('point', {
    x: boundingRect.left + coordinates.left - element.scrollLeft,
    y: boundingRect.top + coordinates.top - element.scrollTop,
  })
}
