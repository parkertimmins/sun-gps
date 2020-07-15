
import React from 'react';
import 'leaflet/dist/leaflet.css';

/*
import 'leaflet/dist/images/layers-2x.png'
import 'leaflet/dist/images/layers.png'
import 'leaflet/dist/images/marker-icon-2x.png'
import 'leaflet/dist/images/marker-icon.png'
import 'leaflet/dist/images/marker-shadow.png'
 */     

import { Map, Marker, Popup, TileLayer, GeoJSON } from 'react-leaflet'



class App extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            needUserPermission: true,
            cameraVisible: true
        };

        this.toggleCameraMap = this.toggleCameraMap.bind(this)

    }
        
    toggleCameraMap() {
        this.setState({ cameraVisible: !this.state.cameraVisible })
    }

    render() {
        if (this.state.needUserPermission) {
            return <RequestPermsModal givePermission={() => this.setState({ needUserPermission: false })} />
        } 
      
        return ( 
            <>
                <Tab hidden={!this.state.cameraVisible}>          
                    <CameraView toggleCameraMap={this.toggleCameraMap} /> 
                </Tab>
                
                <Tab hidden={this.state.cameraVisible}>
                    <MapView toggleCameraMap={this.toggleCameraMap} /> 
                </Tab>
            </>
        );
    }
}

function Tab(props) {
  return (
    <div className={props.hidden ? 'hidden' : ''}>
        {props.children}
    </div>
  );
}

function RequestPermsModal(props) {
    return (
        <div id="request-perms-modal">
            <div id="modal-content">
                <button id="request-perms" onClick={props.givePermission}>Allow orientation sensor</button>
            </div> 
        </div> 
    );
}


let idx = 0;


class LeafletMap extends React.Component {
    constructor(props) {
        super(props);
            this.mapRef = React.createRef();
    }
    
    componentDidUpdate() {
        this.mapRef.current.leafletElement.invalidateSize()
    }

    render() {
        return (
            <Map ref={this.mapRef} center={[24.944292, 0.202651]} zoom={2}>
                <GeoJSON key="countries" data={this.props.countryJson} />
                <GeoJSON key="states" data={this.props.stateJson} />
            </Map>
        );
    }
}

class MapView extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            countryJson: null,
            stateJson: null,
            cityJson: null
        }
    }

    componentDidMount() {
        this.getGeoJSON();
    }

    fetchJSON(url) {
        return fetch(url).then(response => response.json());
    }

    getGeoJSON() {
        this.fetchJSON('./natural-earth-data/ne_50m_admin_0_sovereignty.geojson')
            .then(data => this.setState({ countryJson: data }));
            //.then(data => L.geoJSON(data, {color: 'green'}).addTo(map))
        
        this.fetchJSON('./natural-earth-data/ne_50m_admin_1_states_provinces_lines.geojson')
            .then(data => this.setState({ stateJson: data }));
            //.then(data => L.geoJSON(data, {color: 'green'}).addTo(map))

        this.fetchJSON('./natural-earth-data/ne_50m_populated_places_simple.geojson')
            .then(data => this.setState({ cityJson: data }));
            //.then(data => L.geoJSON(data, { 
             //   pointToLayer: (geoJsonPoint, latlng) => L.circle(latlng, {radius: 10000, color: 'green'})
            //}).addTo(map))
    }

                //{ this.state.countryJson ?  <GeoJSON data={this.state.countryJson} /> : null } 
//                { this.state.stateJson ?  <GeoJSON data={this.state.stateJson} /> : null } 
    render() {
        return (
            <div>
                <div className="top-row control-row">
                    <button type="button" className="round-button" title="Go to Camera view" onClick={this.props.toggleCameraMap}>📷</button>
                </div>
                <div id="map-pane"> 
                    { (this.state.countr&& this.state.states) && 
                        <LeafletMap counties={this.state.countries} />
                    }
                </div>
            </div>
        );
    }
    
}

class CameraView extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div>
                <div className="top-row control-row">
                    <button  className="round-button" title="Go to Map view" onClick={this.props.toggleCameraMap}>🌎</button>
                </div>
                
                <div id="camera-image" className="fullscreen-pane"> 
                    <video autoPlay playsInline></video>
                    <canvas id="canvas1"></canvas>
                </div>
                        
                <div className="bottom-row control-row"> 
                    <button id="switch-camera" type="button" className="round-button">🔄</button>
                    <button id="find-location-moon" type="button" className="round-button" title="Find location by Moon">🌘</button>
                    <button id="find-location-sun" type="button" className="round-button" title="Find location by Sun">☀️ </button>
                </div>
            </div>
        );
    }
}

export default App;



   /*    

import { julianCenturies, toJulian } from './js/julian';
import { Moon } from './js/moon';
import { moonComputeLocation } from './js/celestial';



const state = {
	altAz: null
}


const video = document.querySelector('video');

const cameras = [];
let selectedCameraIdx = null;


const canvas1 = document.getElementById('canvas1');
const ctx1 = canvas1.getContext('2d');

let map = null;

//const canvas2 = document.getElementById('canvas2');
//const ctx2 = canvas2.getContext('2d');



document.getElementById("request-perms").onclick = iOSGetOrientationPerms;
function iOSGetOrientationPerms() {
    document.getElementById("request-perms-modal").style.display = 'none';
    
    // feature detect
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission()
        .then(permissionState => {
          if (permissionState === 'granted') {
            window.addEventListener('deviceorientation', () => {
                console.log("alpha", event.alpha);
                console.log("beta", event.beta);
                console.log("gamma", event.gamma);
                console.log("webkitCompassHeading", event.webkitCompassHeading);
            });
          }
        })
        .catch(console.error);
    } else {
        console.log("DeviceOrientation not available");
      // handle regular non iOS 13+ devices
    }
}

if (!isIOS()) {
    console.log("Initializing sensor for Android");
    
    const sensor = new window.AbsoluteOrientationSensor({frequency: 60, referenceFrame: 'device' })
    sensor.start();
    // constantly update altitude and azimuth in global state
    sensor.addEventListener('reading', e => {
        state.altAz = computeAltAz(sensor.quaternion)    
    });
}

function isIOS() {
    return /(iPad|iPhone|iPod)/g.test(navigator.userAgent);
}

function initVideo() {
    if (!hasGetUserMedia()) {
        alert('getUserMedia() is not supported by your browser');
        return;
    }

    // iphone request ask permission before enumerating devices
	navigator.mediaDevices
        .getUserMedia({ video: true })
        .then(() => {
	        navigator.mediaDevices
                .enumerateDevices()
                .then(addVideoDevicesToCameraList)
                .then(setSelectedStream)
                .catch(handleError);
        })
}

function setSelectedStream() {
	setVideoToSelectedStream()
	setCanvasToSelectStream();
}

function timerCallback() {
	copyVideoToCanvas();
	setTimeout(timerCallback, 10);
}

function copyVideoToCanvas() {
	
	// should probably not do every frame ¯\_(ツ)_/¯
	setCanvasDimensions();

	if (canvas1.width === 0 || canvas1.height === 0) {
		return;
	}

	const canvas = canvas1
	const ctx = canvas.getContext("2d");
	
	// first copy frame from video element to canvas
	ctx.drawImage(video, 0, 0);

	ctx.strokeStyle = "white";
	ctx.lineWidth = 1 
	ctx.beginPath();
	ctx.moveTo(0, canvas.height / 2);
	ctx.lineTo(canvas.width, canvas.height / 2);
	
	ctx.moveTo(canvas.width / 2, 0);
	ctx.lineTo(canvas.width / 2, canvas.height);
	ctx.stroke();	
}


function copyVideoFrameWithChanges() {
	
	// should probably not do every frame ¯\_(ツ)_/¯
	setCanvasDimensions();

	if (canvas1.width === 0 || canvas1.height === 0 || canvas2.width === 0 || canvas2.height === 0) {
		return;
	}
	
	// first copy frame from video element to canvas
	ctx1.drawImage(video, 0, 0);

	
	const frame = ctx1.getImageData(0, 0, canvas1.width, canvas1.height);
	const pixels = frame.data.length / 4;


    const heap = new goog.structs.Heap();
    const numMax = 1000;
	for (let i = 0; i < pixels; i++) {
		const pixel = i;
		const r = frame.data[i * 4 + 0];
	  	const g = frame.data[i * 4 + 1];
	  	const b = frame.data[i * 4 + 2];

		const intensity = r + g + b

        heap.insert(intensity, pixel) 
        if (heap.getCount() > numMax) {
            heap.remove() 
        }
	}

    const rcPairs = heap.getValues()
	    .map(pixel => pixelToRc(pixel, canvas1.width))
	const rCenter = Math.round(avg(rcPairs.map(rc => rc[0])))
	const cCenter = Math.round(avg(rcPairs.map(rc => rc[1])))
    console.log(rCenter, cCenter)
    
    const square = 10	
	for (let r = rCenter - square; r < rCenter + square; r++) {
		for (let c = cCenter - square; c < cCenter + square; c++) {
			const pixel = r * canvas2.width + c
			const i = pixel
			frame.data[i * 4 + 0] = 255; // r
			frame.data[i * 4 + 1] = 0; // g
			frame.data[i * 4 + 2] = 255; // b
		}
	}				
	
	ctx2.putImageData(frame, 0, 0);
}

function pixelToRc(pixel, width) {
	const r = pixel / width
	const c = pixel % width 
	return [r, c]

}

function avg(nums) {
	const sum = 0
	for (let n of nums) {
		sum += n
	} 	
	return sum / parseFloat(nums.length)
}

// sets logically pixel width of canvas, not size of html element, hence works with width: 100% 
function setCanvasDimensions() {
	canvas1.width = video.videoWidth
	canvas1.height = video.videoHeight
	//canvas2.width = video.videoWidth
	//canvas2.height = video.videoHeight
}

function setCanvasToSelectStream() {
	console.log('calling setCanvasToSelectStream')
	timerCallback();
}

function setVideoToSelectedStream() {
	if (window.stream) {
  		window.stream.getTracks().forEach(track => track.stop())
  	}

	const constraints = {
		video: { deviceId: cameras[selectedCameraIdx].deviceId  }
  	};

  	return navigator.mediaDevices
		.getUserMedia(constraints)
		.then(stream => {
			  window.stream = stream; // make stream available to console
			  video.srcObject = stream;
		})
}

function handleError(error) {
    console.error('Error: ', error);
}

function addVideoDevicesToCameraList(deviceInfos) {
	for (let i = 0; i !== deviceInfos.length; ++i) {
		const deviceInfo = deviceInfos[i];
		
		if (deviceInfo.kind === 'videoinput') {
            cameras.push(deviceInfo);

            // use this camera if is back camera
            if (deviceInfo.label && deviceInfo.label.toLowerCase().includes("back")) {
                selectedCameraIdx = cameras.length - 1;
            }
		}
	}
    if (selectedCameraIdx == null) {
        selectedCameraIdx = 0;
    }
}

function hasGetUserMedia() {
      return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

window.onload = function() {
    
	map = L.map('map', {
		center: [24.944292, 0.202651],
		zoom: 2
	})
    
	loadBaseMap();
	initVideo();

	document.getElementById("find-location-moon").onclick = () => {
		const { lat, long } = moonComputeLocation(state.altAz, Date.now())
		const latLong = [lat, toRegLong(long)].map(n => n.toFixed(4))
			
		//const marker = L.marker([lat, longReg]).addTo(map);	
		const popup = L.popup({ closeOnClick: false, autoClose: false })
			.setLatLng(latLong)
			.setContent(JSON.stringify(latLong))
			.openOn(map);

		map.setView(latLong, 5)
	}

	document.getElementById("show-camera").onclick = () => {
		document.getElementById("camera-pane").style.display = 'block'
		document.getElementById("map-pane").style.display = 'none'
		document.getElementById("show-map").style.display = 'block'
		document.getElementById("show-camera").style.display = 'none'
	}

	document.getElementById("show-map").onclick = () => {
		document.getElementById("camera-pane").style.display = 'none'
		document.getElementById("map-pane").style.display = 'block'
		document.getElementById("show-map").style.display = 'none'
		document.getElementById("show-camera").style.display = 'block'
		map.invalidateSize()
	}
	
    document.getElementById("switch-camera").onclick = () => {
        selectedCameraIdx = (selectedCameraIdx + 1) % cameras.length;
        setSelectedStream();
    }
   
    // show modal to request perms i
    //if (isIOS()) { 
        document.getElementById("request-perms-modal").style.display = "block";
    //}
}
*/
