var ping = 0

document.querySelector('#testSpeedButton').addEventListener('click', e => {
    document.querySelector('#testSpeedButton').disabled = true
    console.log('start testing')
    var timeRecieve
    var chunkRecieved = 0
    const updateResult = setInterval(() => {
        console.log(chunkRecieved)
        const speed = 0.008 * chunkRecieved / (performance.now() - timeRecieve)
        document.querySelector('#speeddisplay').innerHTML = (Math.round(speed * 100) / 100) + 'Mb/s'
    }, 1000)
    var timeTemp = performance.now()
    fetch('/bigfile').then(respond => {
        timeRecieve = performance.now()
        ping = Math.round(timeRecieve - timeTemp)
        document.querySelector('#pingdisplay').innerHTML = ping + 'ms'
        const reader = respond.body.getReader()
        reader.read().then(function processText({ done, value }) {
            if (done) {
                document.querySelector('#testSpeedButton').disabled = false
                clearInterval(updateResult)
                return
            }
            // console.log(chunkRecieved)
            chunkRecieved += value.length
            speed = 0.008 * chunkRecieved / (performance.now() - timeRecieve)
            return reader.read().then(processText)
        })
    })

})

