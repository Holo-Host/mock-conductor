const WebSocket = require('ws')
const msgpack = require('@msgpack/msgpack')
const _ = require('lodash')

const port = process.argv[2] || 8888

const wss = new WebSocket.Server({ port })

const APP_INFO_TYPE = 'app_info'
const ZOME_CALL_TYPE = 'zome_call_invocation'

// responseQueues are keyed by a stringified combination of type and data. See generateResponseKey
let responseQueues = {}

function initResponseQueues() {
  responseQueues = {}
}

function generateResponseKey (type, data) {
  return `${type}:${JSON.stringify(_.omit(data, 'payload'))}`
}

function addResponse (message, ws) {
  const { requestType, data, response } = message

  if (![APP_INFO_TYPE, ZOME_CALL_TYPE].includes(requestType)) {
    ws.send(JSON.stringify({error: `Unknown request type: ${requestType}`}))
  }

  const responseKey = generateResponseKey(requestType, data)

  if (!responseQueues[responseKey]) {
    responseQueues[responseKey] = []
  }

  responseQueues[responseKey].push(response)

  ws.send(JSON.stringify({ok: true}))
}

function clearResponses (ws) {
  initResponseQueues()
  ws.send(JSON.stringify({ok: true}))
}

function shutdownServer(ws) {
  ws.terminate()
  process.exit()
}

function handleHCRequest (message, ws) {
  const decoded = msgpack.decode(message)
  const { id } = decoded
  const request = msgpack.decode(decoded.data)
  const { type, data } = request 

  const responseKey = generateResponseKey(type, data)

  if (!responseQueues[responseKey]) {
    throw new Error(`No more responses for: ${responseKey}`)
  }

  var responsePayload = responseQueues[responseKey].pop()

  if (type === ZOME_CALL_TYPE) {
    // there's an extra layer of encoding in the zome call responses
    responsePayload = msgpack.encode(responsePayload)
  }
  
  const responseData = msgpack.encode({
    type,
    data: responsePayload
  })  


  const response = {
    type: 'Response',
    id,
    data: responseData
  }

  ws.send(msgpack.encode(response))
}

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message) {

    let parsedMessage

    try {
      parsedMessage = JSON.parse(message)
    } catch (e) {
      // failed to parse so treat it as a HC request
      handleHCRequest(message, ws)
    }

    switch (parsedMessage.cmd) {
      case 'add_response':
        addResponse(parsedMessage, ws)
        break
      case 'clear_responses':
        clearResponses(ws)
        break
      case 'shutdown_server':
        shutdownServer(ws)
        break
      default:
        throw new Error(`Unrecognized command: ${parsedMessage.cmd}`)
    }
  })
})