/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import React, {Component} from 'react';
import {Platform, StyleSheet, Text, View, Button, StatusBar, Image} from 'react-native';
import { RNSerialport } from 'react-native-serialport';
import {DeviceEventEmitter} from 'react-native';
import Canvas, {Image as CanvasImage, Path2D} from 'react-native-canvas';
import { Icon, Header } from 'react-native-elements';

const welcome = "Connect your Gameboy Camera and PRINT";
// TILE CONSTANTS
const TILE_PIXEL_WIDTH = 8;
const TILE_PIXEL_HEIGHT = 8;
const TILES_PER_LINE = 20; // Gameboy Printer Tile Constant
/* var square_width = 450 / (TILE_PIXEL_WIDTH * TILES_PER_LINE);
var square_height = square_width; */
var square_width = null;
var square_height = null;

const colors = new Array("#ffffff", "#aaaaaa", "#555555", "#000000");

function render_gbp(canvas, rawBytes, canvas_width)
{   // Returns false on error
    var status = true;
	var square_width = canvas_width / (TILE_PIXEL_WIDTH * TILES_PER_LINE);
	var square_height = square_width;
    // Clear Screen
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // rawBytes is a string of hex where each line represents a gameboy tile
    var tiles_rawBytes_array = rawBytes.split(/\n/);

    /* Dry run, to find height */

    var total_tile_count = 0;

    for (var tile_i = 0; tile_i < tiles_rawBytes_array.length; tile_i++) 
    {   // Process each gameboy tile
        tile_element = tiles_rawBytes_array[tile_i];

        // Check for invalid raw lines
        if (tile_element.length == 0)
        {   // Skip lines with no bytes (can happen with .split() )
            continue;
        }
        else if (/[^0-9a-z]/i.test(tile_element[0]) == true)
        {   // Skip lines used for comments
            continue;
        }

        // Increment Tile Count Tracker
        total_tile_count++;
    }

    var tile_height_count = Math.floor(total_tile_count / TILES_PER_LINE);

    // Resize height (Setting new canvas size will reset canvas)
    canvas.width = square_width * TILE_PIXEL_WIDTH * TILES_PER_LINE;
    canvas.height = square_height * TILE_PIXEL_HEIGHT * tile_height_count;

    console.log("lol"+canvas.height);

    /* Render Screen Tile by Tile */

    var tile_count = 0, tile_x_offset = 0, tile_y_offset = 0;

    for (var tile_i = 0; tile_i < tiles_rawBytes_array.length; tile_i++) 
    {   // Process each gameboy tile
        tile_element = tiles_rawBytes_array[tile_i];

        // Check for invalid raw lines
        if (tile_element.length == 0)
        {   // Skip lines with no bytes (can happen with .split() )
            continue;
        }
        else if (/[^0-9a-z]/i.test(tile_element[0]) == true)
        {   // Skip lines used for comments
            console.log(tile_element)
            continue;
        }

        // Gameboy Tile Offset
        tile_x_offset = tile_count % TILES_PER_LINE;
        tile_y_offset = Math.floor(tile_count / TILES_PER_LINE);

        pixels = decode(tile_element);

        if (pixels) 
        {
            paint(canvas, pixels, square_width, square_height, tile_x_offset, tile_y_offset);
        }
        else 
        {
            status = false;
        }

        // Increment Tile Count Tracker
        tile_count++;
    }
    return status;
}

function decode(rawBytes) 
{   // Gameboy tile decoder function from http://www.huderlem.com/demos/gameboy2bpp.html
    var bytes = rawBytes.replace(/ /g, "");
    if (bytes.length != 32) return false;
    
    var byteArray = new Array(16);
    for (var i = 0; i < byteArray.length; i++) {
        byteArray[i] = parseInt(bytes.substr(i*2, 2), 16);
    }

    var pixels = new Array(TILE_PIXEL_WIDTH*TILE_PIXEL_HEIGHT);
    for (var j = 0; j < TILE_PIXEL_HEIGHT; j++) {
        for (var i = 0; i < TILE_PIXEL_WIDTH; i++) {
            var hiBit = (byteArray[j*2 + 1] >> (7-i)) & 1;
            var loBit = (byteArray[j*2] >> (7-i)) & 1;
            pixels[j*TILE_PIXEL_WIDTH + i] = (hiBit << 1) | loBit;
        }
    }
    return pixels;
}

function paint(canvas, pixels, pixel_width, pixel_height, tile_x_offset, tile_y_offset )
{   // This paints the tile with a specified offset and pixel width

    tile_offset     = tile_x_offset * tile_y_offset;
    pixel_x_offset  = TILE_PIXEL_WIDTH   * tile_x_offset * pixel_width;
    pixel_y_offset  = TILE_PIXEL_HEIGHT  * tile_y_offset * pixel_height;

    var ctx = canvas.getContext("2d");

    for (var i = 0; i < TILE_PIXEL_WIDTH; i++) 
    {   // pixels along the tile's x axis
        for (var j = 0; j < TILE_PIXEL_HEIGHT; j++) 
        {   // pixels along the tile's y axis

            // Pixel Color
            ctx.fillStyle = colors[pixels[j*TILE_PIXEL_WIDTH + i]];

            // Pixel Position (Needed to add +1 to pixel width and height to fill in a gap)
            ctx.fillRect(
                    pixel_x_offset + i*pixel_width, 
                    pixel_y_offset + j*pixel_height, 
                    pixel_width + 1 ,
                    pixel_height + 1
                );
        }
    }
}


function hex_to_ascii(data){
	var hex  = data.toString();
	var str = '';
	for (var n = 0; n < hex.length; n += 2) {
		str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
	}
	if(isASCII(str)){
		return str;
	}
	return '';
}

function isASCII(str) {
    return /^[\x00-\x7F]*$/.test(str);
}


export default class App extends Component<Props> {
	constructor(props) {
		super(props);
		this.state = {
			printer_status: 'print',
			printer_status_color: '#aaaaaa',
			text: '',
			Status: '',
			console: '',
			image: '',
			render_bool: false
		};
		this.image_placeholder = '';
		this.canvas = null;
		this.top_cut_canvas = null;
		this.canvas_width = '';
		this.ascii_console_temp = '';
	}
	
	handleCanvas = (canvas) => {
		this.canvas = canvas;
		const ctx = canvas.getContext('2d');
		ctx.fillStyle = 'purple';
		ctx.fillRect(0, 0, 100, 100);
		render_gbp(canvas, this.image_placeholder, 0);
	}
	
	onUsbAttached(){}// { this._getDeviceList() }
	onUsbDetached()  {this.setState({
		Status: 'USB Detached',
		printer_status: 'print',
		printer_status_color: '#aaaaaa',
	})}
	onUsbNotSupperted() {this.setState({Status: 'USB Not Supported'})}
	onError(error) {alert('Code: ' + error.errorCode + ' Message: ' +error.errorMessage)}
	onConnectedDevice()  {this.setState({
		Status: 'Connected',
		printer_status: 'print',
		printer_status_color: '#000',
	})}
	onDisconnectedDevice() {this.setState({
		Status: 'GameBoy Detacted',
		printer_status: 'print',
		printer_status_color: '#aaaaaa',
	})}
	onServiceStarted() {this.setState({
		Status: 'Connect your GameBoy',
		printer_status: 'print',
		printer_status_color: '#aaaaaa',
	})}
	onServiceStopped() {this.setState({Status: 'Service Stopped'})}
	onReadData(data) {
		let ascii_console = hex_to_ascii(data);
		//this.setState({ascii_console: ascii_console});
		//console.warn("ascii: " + ascii_console + "data: " + data);
		if (data.startsWith("232047")){
			this.setState({text: "GameBoy Printer Emulator connected, now PRINT", printer_status_color: '#000'});
		}// BAD ASCII
		else if(ascii_console == ''){
			this.setState({text: ''});
		}// GOOD ASCII
		else {
			this.ascii_console_temp += ascii_console;
			this.setState({text: 'receiving...'});
			if(this.ascii_console_temp.includes("# Finished Pretending")){
				console.warn("finished printing");
				this.setState({text: 'Image recieved'});
				this.setState({image: this.ascii_console_temp});
				this.setState({render_bool: true});
			}
		}
	}

	componentWillUpdate(nextProps, nextState) {
		// Are we adding new items to the list?
		// Capture the scroll position so we can adjust scroll later.
		//if (this.props.list.length < nextProps.list.length) {
		//	this.previousScrollOffset =
		//	this.listRef.scrollHeight - this.listRef.scrollTop;
		//}
	}

	componentDidUpdate(prevProps, prevState) {
		if (this.state.render_bool) {
			//console.warn("FINISHED PRINTING");
			this.setState({text: 'Rendering photo'});
			this.ascii_console_temp = '';
			console.warn("ascii_console_temp: " + this.ascii_console_temp);
			render_gbp(this.canvas, this.state.image, this.canvas_width);
			this.setState({render_bool: false});
		}
	}
	
	componentDidMount() {
		DeviceEventEmitter.addListener('onServiceStarted', this.onServiceStarted, this)
		DeviceEventEmitter.addListener('onServiceStopped', this.onServiceStopped,this)
		DeviceEventEmitter.addListener('onDeviceAttached', this.onUsbAttached, this)
		DeviceEventEmitter.addListener('onDeviceDetached', this.onUsbDetached, this)
		DeviceEventEmitter.addListener('onDeviceNotSupported', this.onUsbNotSupperted, this)
		DeviceEventEmitter.addListener('onError', this.onError, this)
		DeviceEventEmitter.addListener('onConnected', this.onConnectedDevice, this)
		DeviceEventEmitter.addListener('onDisconnected', this.onDisconnectedDevice, this)
		DeviceEventEmitter.addListener('onReadDataFromPort', this.onReadData, this)
		//Added listeners
		RNSerialport.setAutoConnectBaudRate(115200)
		RNSerialport.setAutoConnect(true)
		RNSerialport.startUsbService()
	}

	componentWillMount() {
		DeviceEventEmitter.removeAllListeners()
	}
	
	find_dimesions(layout){
		const {x, y, width, height} = layout;
		//console.warn(x);
		//console.warn(y);
		//console.warn(width);
		//console.warn(height);
		this.canvas_width = width;
	}
	
	/* cutCanvas = (canvas) => {
	this.top_cut_canvas = canvas;
    const ctx = canvas.getContext('2d');
	ctx.fillStyle = 'purple';
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.lineTo(0, 30);
    ctx.lineTo(30, 30);
    ctx.fill();
	} */
	
		
   render() {
    return (
    <View onLayout={(event) => { this.find_dimesions(event.nativeEvent.layout) }} style={styles.main}>
		<Header
			statusBarProps={{ barStyle: 'default'}}
			//leftComponent={{ icon: 'menu', color: '#fff' }}
			centerComponent={{ text: 'GAMEBOY PRINTER', style: { color: '#fff', fontFamily: 'Early GameBoy Regular'} }}
			rightComponent={{ icon: this.state.printer_status, color: this.state.printer_status_color,}}
			containerStyle={{borderStyle: 'none'}}
			backgroundColor='#872D63'
			//backgroundColor='#F5FCFF'
		/>
		<View style={styles.container}>
			<Text style={styles.instructions}>{this.state.Status}</Text>
			<Text style={styles.instructions}>{this.state.text}</Text>
			<Text style={styles.instructions}>{this.state.console}</Text>
		</View>
		<View style={styles.canvasborder}>
		<Canvas ref={this.handleCanvas} style={styles.canvas}></Canvas>
		</View>
	</View>
    );
  }
}
//38
const styles = StyleSheet.create({
  container: {
	fontFamily: 'Early GameBoy Regular',
	//paddingTop: 50,
    justifyContent: 'center',
    alignItems: 'center',
    //backgroundColor: '#ccc',
	color: '#323586',
  },
  main: {
	//backgroundColor: '#fff',
	backgroundColor:'#ccc', 
	flex: 1,
  },
  welcome: {
	  //fontFamily: 'Early GameBoy Regular',
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  instructions: {
	//fontFamily: 'Early GameBoy Regular',
    //textAlign: 'center',
    color: '#323586',
    //marginBottom: 5,
  },
  canvas: {
	  borderWidth: 1,
	  //height: {this.canvas_height},
	  borderColor: '#000',
	  backgroundColor: '#000',
	  //marginTop:25,
  },
  palette: {
	  width: 100,
	  height: 10,
  },
  canvasborder: {
	  borderWidth: 0,
	  borderColor: '#000',
	  backgroundColor: '#fff',
	  //borderBottomWidth: 3,
	  //borderTopWidth: 3,
	  //borderLeftWidth: 0,
	  //borderRightWidth: 0,
	  paddingTop:50,
	  paddingBottom:50,
  }
});