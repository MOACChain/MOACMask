const inherits = require('util').inherits
const Component = require('react').Component
const h = require('react-hyperscript')
const connect = require('react-redux').connect
const actions = require('../../ui/app/actions')
const getCaretCoordinates = require('textarea-caret')
const EventEmitter = require('events').EventEmitter

const Mascot = require('./components/mascot')

module.exports = connect(mapStateToProps)(UnlockScreen)

inherits(UnlockScreen, Component)
function UnlockScreen () {
  Component.call(this)
  this.animationEventEmitter = new EventEmitter()
}

function mapStateToProps (state) {
  return {
    warning: state.appState.warning,
  }
}

UnlockScreen.prototype.render = function () {
  const state = this.props
  const warning = state.warning
  return (
    h('.flex-column', {
      style: {
        width: 'inherit',
      },
    }, [
      h('.unlock-screen.flex-column.flex-center.flex-grow', [

        h('img', {
          src: 'https://lh3.googleusercontent.com/3hWM-FU9nnRvc8yqJ1c_dbljAFMnPtRuhQyUJyXvDTrn9ifLmUhe6H8IQXb8MzZ1O4MRteQCAFcHfxJUKtZMBzp51sOzb_bMIIIiYiruR8Ib93NzJkG9APrYx9nytnFDjO38ac2hM60q4ExLtkHSzc5YQzuapF_n9zrb93qdP-3QUSvchmTMwZMea0NsAJHGDRhtOokfh603br5aHGnUPcYX0-gmtyf6ROKyQ9fiXXzsYYixuAcieZVb4IiyT3yf-HM2FpEIY53eqNnP1aOcKrFVO7vd3AkyWP4haBoeUu0Y62BbL8gauzsnii5_6X4AOZ1Nq2V6HNq-UJAw4Wqr3B1uRGacCNh7vy7TxLEgBzKMWV7hmUk0Yf0Rv9K6IWIE2fXlXEe8NjtruT_vlutPQPuvUlziWWJ6zrNyVdSscfsS3PU0BavL7-jXe6DtdCMQLR7bijnZ_B9mivUOxOxbyQ02t3945c9396V4A2cQFZ0SwWiQ-I1M-op2JC94kKsXgb5D_LjLc7L5z22Pwc09JIQ9pdqoJBahfFF9CxkQvA53wx4ayqagHTU10v6U8h0obaHGDXCuX9mOY4l_ZwmUvEMvQFABkm0Wb5gcuZNQ7XEpz5MJlvLmW7wdFnB4Gg=s512-no',
          style: {
            width: '250px',
            maxWidth: '90%',
          },
        }),

        h('input.large-input', {
          type: 'password',
          id: 'password-box',
          placeholder: 'enter password',
          style: {

          },
          onKeyPress: this.onKeyPress.bind(this),
          onInput: this.inputChanged.bind(this),
        }),

        h('.error', {
          style: {
            display: warning ? 'block' : 'none',
            padding: '0 20px',
            textAlign: 'center',
          },
        }, warning),

        h('button.primary.cursor-pointer', {
          onClick: this.onSubmit.bind(this),
          style: {
            margin: 10,
          },
        }, 'Log In'),
      ]),

      h('.flex-row.flex-center.flex-grow', [
        h('p.pointer', {
          onClick: () => this.props.dispatch(actions.forgotPassword()),
          style: {
            fontSize: '0.8em',
            color: 'rgb(247, 134, 28)',
            textDecoration: 'underline',
          },
        }, 'Restore from seed phrase'),
      ]),
    ])
  )
}

UnlockScreen.prototype.componentDidMount = function () {
  document.getElementById('password-box').focus()
}

UnlockScreen.prototype.onSubmit = function (event) {
  const input = document.getElementById('password-box')
  const password = input.value
  this.props.dispatch(actions.tryUnlockMetamask(password))
}

UnlockScreen.prototype.onKeyPress = function (event) {
  if (event.key === 'Enter') {
    this.submitPassword(event)
  }
}

UnlockScreen.prototype.submitPassword = function (event) {
  var element = event.target
  var password = element.value
  // reset input
  element.value = ''
  this.props.dispatch(actions.tryUnlockMetamask(password))
}

UnlockScreen.prototype.inputChanged = function (event) {
  // tell mascot to look at page action
  var element = event.target
  var boundingRect = element.getBoundingClientRect()
  var coordinates = getCaretCoordinates(element, element.selectionEnd)
  this.animationEventEmitter.emit('point', {
    x: boundingRect.left + coordinates.left - element.scrollLeft,
    y: boundingRect.top + coordinates.top - element.scrollTop,
  })
}
