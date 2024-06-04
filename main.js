import { publishableToken, demoSceneId, startupOptions } from './config.js';

const container = document.getElementById('demo-plan')
const floorPlan = new FloorPlanEngine(container, startupOptions)

let active = {}

floorPlan.loadScene(demoSceneId, {
    publishableToken
}).then(async () => {

    floorPlan.on('click', highlightSpaces, floorPlan)

    // on load create query parameters object where {key = param: value = paramValue}
    const urlSearchParams = new URLSearchParams(window.location.search)
    const params = Object.fromEntries(urlSearchParams.entries())

    switch (params.overlay) {
        case 'occupancy':
            document.getElementById('occupancy').checked = 'checked'
            activateOccupancy()
            break
        case 'iaq':
            document.getElementById('IAQ').checked = 'checked'
            activateIAQ()
            break
        case 'humidity':
            document.getElementById('humidity').checked = 'checked'
            activateHumidity()
            break
        case 'temperature':
            document.getElementById('temperature').checked = 'checked'
            activateTemperature()
            break
        default:
            document.getElementById('map').checked = 'checked'
            console.log('No query params set')
    }

    // on change event handler when radio button value changes
    const radios = document.querySelectorAll('input[name="filter"]')

    // event handler callback
    const filterEventHandler = (event) => {

        let radioValue = event.target.value

        switch (radioValue) {
            case 'occupancy':
                activateOccupancy()
                deactivateIAQ()
                deactivateHumidity()
                deactivateTemperature()
                break
            case 'IAQ':
                activateIAQ()
                deactivateOccupancy()
                deactivateHumidity()
                deactivateTemperature()
                break
            case 'humidity':
                activateHumidity()
                deactivateIAQ()
                deactivateOccupancy()
                deactivateTemperature()
                break
            case 'temperature':
                activateTemperature()
                deactivateIAQ()
                deactivateOccupancy()
                deactivateHumidity()
                break
            default:
                deactivateOccupancy()
                deactivateIAQ()
                deactivateHumidity()
                deactivateTemperature()
        }

    }

    // applying event listener to each radio button
    for (let i = 0; i < radios.length; i++) {
        radios[i].addEventListener('change', filterEventHandler)
    }

})

const activateOccupancy = () => {
    getSpaceOccupancy()
    getAssetOccupancy()
    startInterval()
}

const deactivateOccupancy = () => {
    stopInterval()
    const spaces = floorPlan.state.resources.spaces
    const hubSpaces = spaces.filter((space) => space.usageName === 'Hub')

    // change asset highligts (phonebooth) back to default colors
    hubSpaces.forEach((space, i) => {
        space.assets.forEach((id, j) => {
            let asset = floorPlan.state.resources.assets.find(
                (found) => found.id === id
            )
            if (asset.name === 'Phone Booth 117/117' || asset.name === 'Phone Booth 217/117') {
                asset.node.setHighlight({
                    fill: [190, 190, 190]
                })
            }
        })

    }) 

    // change space highlights back to default colors
    spaces.forEach((space, i) => {
        // console.log(`This is I: ${i}`)

        if (space.usage === 'restroom' || space.usage === 'wellnessRoom') {
            space.node.setHighlight({
                fill: [209, 242, 235]
            })
        } else if (space.program === 'circulate') {
            space.node.setHighlight({
                fill: [243, 242, 240]
            })
        } else {
            space.node.setHighlight({
                fill: [255, 255, 255]
            })
        }

    })

}

// dont show markers until they are created
const activateIAQ = () => {
    createIAQMarkers()
}

// remove markers via SDK
const deactivateIAQ = () => {
    if (document.querySelectorAll('.iaq-marker').length > 0) {
        document.querySelectorAll('.iaq-marker').forEach((div) => {
            div.remove()
        })
    }    
}

const activateHumidity = () => {
    createHumidityMarkers()
}

const deactivateHumidity = () => {
    if (document.querySelectorAll('.humidity-marker').length > 0) {
        document.querySelectorAll('.humidity-marker').forEach((div) => {
            div.remove()
        })
    }
}

const activateTemperature = () => {
    createTemperatureMarkers()
}

const deactivateTemperature = () => {
    if (document.querySelectorAll('.temperature-marker').length > 0) {
        document.querySelectorAll('.temperature-marker').forEach((div) => {
            div.remove()
        }) 
    }    
}

let interval

const startInterval = () => {
    interval = setInterval(() => {
        getAssetOccupancy()
    }, 5000)
}

const stopInterval = () => {
    clearInterval(interval)
}

const getAssetOccupancy = () => {

    const spaces = floorPlan.state.resources.spaces
    const hubSpaces = spaces.filter((space) => space.usageName === 'Hub')

    const occupiedColor = [227, 108, 100]
    const freeColor = [100, 179, 121]

    hubSpaces.forEach((space, i) => {
        space.assets.forEach((id, j) => {
            let asset = floorPlan.state.resources.assets.find(
                (found) => found.id === id
            )

            // 40% chance asset is occupied
            if (asset.name === 'Phone Booth 117/117' || asset.name === 'Phone Booth 217/117') {
                let isOccupied = Math.random() > 0.6
                let fill = isOccupied ? occupiedColor : freeColor
                asset.node.setHighlight({
                    fill,
                    fillOpacity: 0.9
                })
            }

        })
    })

}

const getSpaceOccupancy = () => {

    const spaces = floorPlan.state.resources.spaces

    // create separate arrays with elements that pass test
    const workSpaces = spaces.filter((space) => space.program === 'work' && space.usageName != 'Open workspace')
    // console.log(workSpaces)
    const meetSpaces = spaces.filter((space) => space.program === 'meet' && space.usageName != 'Hub')
    // console.log(meetSpaces)
    const focusSpaces = spaces.filter((space) => space.usage === 'focusRoom')
    // console.log(cafeSpaces)
    const cafeSpaces = spaces.filter((space) => space.usageName === 'Cafe')
    // console.log(cafeSpaces)
    const hubSpaces = spaces.filter((space) => space.usageName === 'Hub')
    // console.log(cafeSpaces)

    const occupiedColor = [227, 108, 100]
    const freeColor = [100, 179, 121]
    const gettingBusyColor = [245, 203, 92]

    // get ocupancy for meeting rooms and color them, references the space via external ids
    workSpaces.forEach((space, i) => {
        // 20% chance a room is occupied, returns boolean
        let isOccupied = Math.random() > 0.8
        let fill = isOccupied ? occupiedColor : freeColor
        space.node.setHighlight({
            fill,
            fillOpacity: 0.5
        })
    })

    meetSpaces.forEach((space, i) => {
        // 60% chance a room is occupied, returns boolean
        let isOccupied = Math.random() > 0.4
        let fill = isOccupied ? occupiedColor : freeColor
        space.node.setHighlight({
            fill,
            fillOpacity: 0.5
        })
    })

    focusSpaces.forEach((space, i) => {
        // 60% chance a room is occupied, returns boolean
        let isOccupied = Math.random() > 0.4
        let fill = isOccupied ? occupiedColor : freeColor
        space.node.setHighlight({
            fill,
            fillOpacity: 0.5
        })
    })

    cafeSpaces.forEach((space, i) => {
        // 20% chance a room is occupied, returns boolean
        let isOccupied = Math.random() > 0.8
        let fill = isOccupied ? occupiedColor : freeColor
        space.node.setHighlight({
            fill,
            fillOpacity: 0.5
        })
    })

}

// creates colored air quality markers
const createIAQMarkers = () => {
    // console.log('markers created')

    floorPlan.resources.spaces.forEach((space) => {

        const program = space.program
        const usage = space.usage
        if (usage === 'undefined' ||
            program === 'void' ||
            program === 'circulate' ||
            program === 'socialize' ||
            program === 'support' ||
            program === 'care') {
            return
        }
        // console.log(space)

        const el = document.createElement('div')
        el.classList.add('iaq-marker')

        let randomizer = Math.floor(Math.random() * 100) + 1

        // 75% chance marker is green
        if (randomizer <= 75) {
            const minGreen = 20
            const maxGreen = 50
            const colorGreen = Math.floor(Math.random() * (maxGreen - minGreen + 1)) + minGreen
            el.classList.add('iaq-marker-green')
            el.innerHTML = `<b>${colorGreen}</b>`

            // 3% chance marker is orange
        } else if (randomizer >= 97) {
            const minOrange = 100
            const maxOrange = 120
            const colorOrange = Math.floor(Math.random() * (maxOrange - minOrange + 1)) + minOrange
            el.classList.add('iaq-marker-orange')
            el.innerHTML = `<b>${colorOrange}</b>`

            // 22% chance marker is yellow  
        } else {
            const minYellow = 51
            const maxYellow = 99
            const colorYellow = Math.floor(Math.random() * (maxYellow - minYellow + 1)) + minYellow
            el.classList.add('iaq-marker-yellow')
            el.innerHTML = `<b>${colorYellow}</b>`
        }

        let marker = floorPlan.addHtmlMarker({
            el,
            pos: space.center,
            offset: [0, -35]
        })

    })
}

// creates colored humidity markers
const createHumidityMarkers = () => {
    // console.log('markers created')

    floorPlan.resources.spaces.forEach((space) => {

        const program = space.program
        const usage = space.usage
        if (usage === 'undefined' ||
            program === 'void' ||
            program === 'circulate' ||
            program === 'socialize' ||
            program === 'support' ||
            program === 'care') {
            return
        }

        // console.log(space)

        const el = document.createElement('div')
        el.classList.add('humidity-marker')

        let randomizer = Math.floor(Math.random() * 100) + 1

        // 75% chance marker is green
        if (randomizer <= 75) {
            const minGreen = 37.67
            const maxGreen = 50
            const colorGreen = Math.round(Math.random() * (maxGreen - minGreen) + minGreen)
            el.classList.add('humidity-marker-green')
            el.innerHTML = `<b>${colorGreen}&#37;</b>`
            // 3% chance marker is orange
        } else if (randomizer >= 97) {
            const minOrange = 56
            const maxOrange = 57.93
            const colorOrange = Math.round(Math.random() * (maxOrange - minOrange) + minOrange)
            el.classList.add('humidity-marker-orange')
            el.innerHTML = `<b>${colorOrange}&#37;</b>`
            // 22% chance marker is yellow  
        } else {
            const minYellow = 50.01
            const maxYellow = 55.99
            const colorYellow = Math.round(Math.random() * (maxYellow - minYellow) + minYellow)
            el.classList.add('humidity-marker-yellow')
            el.innerHTML = `<b>${colorYellow}&#37;</b>`
        }

        let marker = floorPlan.addHtmlMarker({
            el,
            pos: space.center,
            offset: [0, -35]
        })

    })
}

// creates colored temperature markers
const createTemperatureMarkers = () => {
    // console.log('markers created')

    floorPlan.resources.spaces.forEach((space) => {

        const program = space.program
        const usage = space.usage
        if (usage === 'undefined' ||
            program === 'void' ||
            program === 'circulate' ||
            program === 'socialize' ||
            program === 'support' ||
            program === 'care') {
            return
        }

        // console.log(space)

        const el = document.createElement('div')
        el.classList.add('temperature-marker')

        let randomizer = Math.floor(Math.random() * 100) + 1

        // 80% chance marker is green
        if (randomizer <= 80) {
            const minGreen = 72.69
            const maxGreen = 77
            const colorGreen = Math.round(Math.random() * (maxGreen - minGreen) + minGreen)
            el.classList.add('temperature-marker-green')
            el.innerHTML = `<b>${colorGreen}&deg;</b>`

            // 3% chance marker is orange
        } else if (randomizer >= 97) {
            const minOrange = 80
            const maxOrange = 81.70
            const colorOrange = Math.round(Math.random() * (maxOrange - minOrange) + minOrange)
            el.classList.add('temperature-marker-orange')
            el.innerHTML = `<b>${colorOrange}&deg;</b>`

            // 17% chance marker is yellow  
        } else {
            const minYellow = 77.01
            const maxYellow = 79.99
            const colorYellow = Math.round(Math.random() * (maxYellow - minYellow) + minYellow)
            el.classList.add('temperature-marker-yellow')
            el.innerHTML = `<b>${colorYellow}&deg;</b>`
        }

        let marker = floorPlan.addHtmlMarker({
            el,
            pos: space.center,
            offset: [0, -35]
        })

    })
}

// set pos of click which gets space via pos & calls highlight() + setInfoWindow()
const highlightSpaces = (event) => {
    if (event.nodeId === undefined) {
        active.infoWindow.remove()
        delete active.infoWindow
    }
    // pos === position
    const pos = event.pos
    const infoPos = [pos[0], pos[1] - 0.5]
    // console.log(infoPos)
    let {
        spaces
    } = floorPlan.getResourcesFromPosition(pos)
    // console.log(spaces)
    if (spaces[0].usage != 'undefined' && spaces[0].program != 'void') {
        highlight(spaces, 'space', [212, 230, 241])
        setInfoWindow(infoPos, spaces)
        // console.log(spaces[0])
    }
}

// highlights space leveraging 'active' space
const highlight = (items, type, color) => {
    // console.log('highlight')
    // console.log(items, type, color)
    if (!items.length) {
        if (active[type]) {
            active[type].node.setHighlight()
            delete active[type]
            return
        }
    }
    let item = items[0]
    // console.log(item)
    if (active[type]?.id === item.id) {
        return
    } else if (active[type]) {
        // active[type].node.setHighlight()
    }
    // item.node.setHighlight({
    //     fill: color
    // })
    active[type] = item
    // console.log(active)  
}

// displays infoWindow leveraging 'active' space
let setInfoWindow = (infoPos) => {
    if (active.space) {
        const assetCount = active.space.assets.length
        const html = `<b>${active.space.usageName}</b><br>Assets: ${assetCount}<br>
        ${active.asset?.name || ''}`
        if (active.infoWindow) {
            active.infoWindow.set({
                pos: infoPos,
                html
            })
        } else {
            active.infoWindow = floorPlan.addInfoWindow({
                pos: infoPos,
                html,
                height: 75,
                width: 150,
                closeButton: false
            })
        }
    } else if (active.infoWindow) {
        active.infoWindow.remove()
        delete active.infoWindow
    }
}