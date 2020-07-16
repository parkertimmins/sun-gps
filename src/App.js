
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

        
        this.toggleCameraMap = this.toggleCameraMap.bind(this);

    }

    toggleCameraMap() {
        this.setState({ cameraVisible: !this.state.cameraVisible })
    }

    givePermission() {
        this.setState({ needUserPermission: false })
    }

    render() {
        if (this.state.needUserPermission) {
            return <RequestPermsModal givePermission={() => this.givePermission()} />
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


class MapView extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            countries: null,
            states: null,
            cities: null
        }
        this.mapRef = React.createRef();
    }

    componentDidMount() {
        this.getGeoJSON();
    }

    componentDidUpdate() {
        this.mapRef.current.leafletElement.invalidateSize()
    }

    fetchJSON(url) {
        return fetch(url).then(response => response.json());
    }

    getGeoJSON() {
        this.fetchJSON('./natural-earth-data/ne_50m_admin_0_sovereignty.geojson')
            .then(data => this.setState({ countries: data }));
            //.then(data => L.geoJSON(data, {color: 'green'}).addTo(map))
        
        this.fetchJSON('./natural-earth-data/ne_50m_admin_1_states_provinces_lines.geojson')
            .then(data => this.setState({ states: data }));
            //.then(data => L.geoJSON(data, {color: 'green'}).addTo(map))

        this.fetchJSON('./natural-earth-data/ne_50m_populated_places_simple.geojson')
            .then(data => this.setState({ cities: data }));
            //.then(data => L.geoJSON(data, { 
             //   pointToLayer: (geoJsonPoint, latlng) => L.circle(latlng, {radius: 10000, color: 'green'})
            //}).addTo(map))
    }

    render() {
        return (
            <div>
                <div className="top-row control-row">
                    <button type="button" className="round-button" title="Go to Camera view" onClick={this.props.toggleCameraMap}>📷</button>
                </div>
                <div id="map-pane"> 
                    <Map ref={this.mapRef} center={[24.944292, 0.202651]} zoom={2}>
                        {this.state.countries && <GeoJSON key="countries" data={this.state.countries} />}
                        {this.state.states && <GeoJSON key="states" data={this.state.states} />}
                    </Map>
                </div>
            </div>
        );
    }
    
}

class CameraView extends React.Component {
    constructor(props) {
        super(props);
        
        this.cameras = [];
        this.selectedCameraIdx = 0;
    
        this.addVideoDevicesToCameraList = this.addVideoDevicesToCameraList.bind(this);
        this.setSelectedStream = this.setSelectedStream.bind(this);
        this.setCanvasToVideo = this.setCanvasToVideo.bind(this);
        this.copyVideoToCanvas = this.copyVideoToCanvas.bind(this);

        this.videoRef = React.createRef();
        this.canvasRef = React.createRef();
    }

    addVideoDevicesToCameraList(deviceInfos) {
        for (let deviceInfo of deviceInfos) {
            if (deviceInfo.kind === 'videoinput') {
                this.cameras.push(deviceInfo);

                // use this camera if is back camera
                if (deviceInfo.label && deviceInfo.label.toLowerCase().includes("back")) {
                    this.selectedCameraIdx = cameras.length - 1;
                }
            }
        }
    }
   
    componentDidMount() {
        this.initVideo();
    } 

    initVideo() {
        /*
        if (!hasGetUserMedia()) {
            alert('getUserMedia() is not supported by your browser');
            return;
        }
        */

        // iphone request ask permission before enumerating devices
        navigator.mediaDevices
            .getUserMedia({ video: true })
            .then(() => {
                navigator.mediaDevices
                    .enumerateDevices()
                    .then(this.addVideoDevicesToCameraList)
                    .then(this.setSelectedStream) // ????
                    .catch(this.handleError);
            })
    }

    setSelectedStream() {
        this.setVideoToSelectedStream()
        this.setCanvasToVideo();
    }
    
    setVideoToSelectedStream() {
        if (window.stream) {
            window.stream.getTracks().forEach(track => track.stop())
        }

        const constraints = {
            video: { deviceId: this.cameras[this.selectedCameraIdx].deviceId  }
        };

        return navigator.mediaDevices
            .getUserMedia(constraints)
            .then(stream => {
                  window.stream = stream; // make stream available to console
                  this.videoRef.current.srcObject = stream;
            })
    }

    setCanvasToVideo() {
        this.copyVideoToCanvas();
        setTimeout(this.setCanvasToVideo, 10);
    }

    handleError(error) {
        console.error('Error: ', error);
    }

    copyVideoToCanvas() {
        const canvas = this.canvasRef.current;
        const video = this.videoRef.current;
        
        // should probably not do every frame ¯\_(ツ)_/¯
        this.setCanvasDimensions();
        
        if (canvas.width === 0 || canvas.height === 0) {
            return;
        }
    
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

    // sets logically pixel width of canvas, not size of html element, hence works with width: 100% 
    setCanvasDimensions() {
        const canvas = this.canvasRef.current;
        const video = this.videoRef.current;
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
    }

    render() {
        return (
            <div>
                <div className="top-row control-row">
                    <button  className="round-button" title="Go to Map view" onClick={this.props.toggleCameraMap}>🌎</button>
                </div>
                
                <div id="camera-image" className="fullscreen-pane"> 
                    <video ref={this.videoRef} autoPlay playsInline></video>
                    <canvas ref={this.canvasRef} id="canvas1"></canvas>
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
