/*
meshmap.js
Copyright (c) 2012 Minoru Akagi

Permission is hereby granted, free of charge, to any person obtaining a
copy of this software and associated documentation files (the "Software"),
to deal in the Software without restriction, including without limitation
the rights to use, copy, modify, merge, publish, distribute, sublicense,
and/or sell copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included
in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
DEALINGS IN THE SOFTWARE.
*/
var map, geocoder, meshMap;
var marker = null, infowindows = [], bounds_style = 1;
var userAgent = window.navigator.userAgent.toLowerCase();
var isMSIE = (userAgent.indexOf("msie")!=-1);
var exportKML_enabled = false && (userAgent.indexOf("chrome")!=-1);
var debug_mode = 0;

// Google Maps JavaScript API v3 - CustomMapTypes
// https://developers.google.com/maps/documentation/javascript/maptypes#CustomMapTypes

// Kiban25000MapType - as a Image Map Type
// http://www.finds.jp/wsdocs/tmc/index.html.ja
var kiban25000TypeOptions = {
	name: "基盤地図",
	alt: "基盤地図情報 (縮尺レベル25000)",
	tileSize: new google.maps.Size(256,256),
	maxZoom: 17,
	minZoom: 0,
	getTileUrl: function(coord, zoom) {
		normalizedCoord = getNormalizedCoord(coord,zoom);
		if(!normalizedCoord) return null;

		var bound = Math.pow(2,zoom);
		return "http://www.finds.jp/ws/tmc/1.0.0/KBN25000ANF-900913/"+zoom+"/"+normalizedCoord.x+"/"+(bound-normalizedCoord.y-1)+".png";
	}
};

function getNormalizedCoord(coord, zoom) {
	var y = coord.y;
	var x = coord.x;
	var tileRange = 1 << zoom;
	if (y < 0 || y >= tileRange) return null;
	if (x < 0 || x >= tileRange) x = (x % tileRange + tileRange) % tileRange;
	return {x: x, y: y};
}

var kiban25000MapType = new google.maps.ImageMapType(kiban25000TypeOptions);


// ChimeiMapType - as a Overlay Map Type
// http://www.finds.jp/wsdocs/tmc/index.html.ja
function ChimeiMapType() {
}
ChimeiMapType.prototype.tileSize = new google.maps.Size(256,256);
ChimeiMapType.prototype.name = "地名";
ChimeiMapType.prototype.getTile = function(tile, zoom, ownerDocument) {
	if(zoom > 6) {
		var img = ownerDocument.createElement("img");
		img.style.width = this.tileSize.width + "px";
		img.style.height = this.tileSize.height + "px";
		var bound = Math.pow(2,zoom);
		img.src = "http://www.finds.jp/ws/tmc/1.0.0/pntms-900913/"+zoom+"/"+tile.x+"/"+(bound-tile.y-1)+".png";
		return img;
	}
	return null;
};
var chimeiMapType = new ChimeiMapType();


// MeshMap - a subclass of OverlayView
function MeshMap(map) {
	this.setMap(map);
	this.map = map;
}
MeshMap.prototype = new google.maps.OverlayView();
MeshMap.prototype.draw = function() {
	if(this.getPanes() == undefined) return;

	overlayLayer = this.getPanes().overlayLayer;
	while(overlayLayer.hasChildNodes()) overlayLayer.removeChild(overlayLayer.firstChild);

	zoom = this.map.getZoom();
	if(zoom <= 3) return;

	bounds = this.map.getBounds();
	m_sw = LatLng2meshcode(bounds.getSouthWest());
	m_ne = LatLng2meshcode(bounds.getNorthEast());

//	$("#debug").html("bounds:"+bounds.toString() + "<br>zoom:" + map.getZoom()+"<br>");
//	$("#debug").append("mesh range:" + m_sw + " - " + m_ne + "<br>");

	y1 = Math.max(30,parseInt(m_sw.substr(0,2)));
	x1 = Math.max(22,parseInt(m_sw.substr(2,2)));
	y2 = Math.min(68,parseInt(m_ne.substr(0,2)));
	x2 = Math.min(53,parseInt(m_ne.substr(2,2)));

	meshBounds = [];
	vm1 = [];

	// list primary mesh in the map view
	for(y = y1; y <= y2; y++) {
		for(x = x1; x <= x2; x++) {
			mc = (y*100+x).toString();
			if(isMeshCodeExists(mc)) {
				vm1.push(parseInt(mc));
			}
		}
	}

	if(zoom > 12) {
		// tertiary mesh
		y1 = parseInt(m_sw.substr(0,2)) * 80 + parseInt(m_sw.substr(4,1)) * 10 + parseInt(m_sw.substr(6,1));
		x1 = parseInt(m_sw.substr(2,2)) * 80 + parseInt(m_sw.substr(5,1)) * 10 + parseInt(m_sw.substr(7,1));
		y2 = parseInt(m_ne.substr(0,2)) * 80 + parseInt(m_ne.substr(4,1)) * 10 + parseInt(m_ne.substr(6,1));
		x2 = parseInt(m_ne.substr(2,2)) * 80 + parseInt(m_ne.substr(5,1)) * 10 + parseInt(m_ne.substr(7,1));

		for(y = y1; y <= y2; y++) {
			for(x = x1; x <= x2; x++) {
				mc1_x = Math.floor(x / 80);
				mc1_y = Math.floor(y / 80);
				mc1 =  mc1_y * 100 + mc1_x;
				if(ArrayIndexOf(vm1, parseInt(mc1)) != -1) {
					mc2 = Math.floor((y - mc1_y * 80) / 10).toString() + Math.floor((x - mc1_x * 80) / 10).toString();
					mc3 = (y % 10).toString() + (x % 10).toString();
					mc = mc1.toString() + "-" + mc2.toString() + "-" + mc3.toString();
					meshBounds[mc] = meshcode2LatLngBounds(mc);
				}
			}
		}
	}
	else if(zoom > 9) {
		// secondary mesh
		y1 = parseInt(m_sw.substr(0,2)) * 8 + parseInt(m_sw.substr(4,1));
		x1 = parseInt(m_sw.substr(2,2)) * 8 + parseInt(m_sw.substr(5,1));
		y2 = parseInt(m_ne.substr(0,2)) * 8 + parseInt(m_ne.substr(4,1));
		x2 = parseInt(m_ne.substr(2,2)) * 8 + parseInt(m_ne.substr(5,1));

		for(y = y1; y <= y2; y++) {
			for(x = x1; x <= x2; x++) {
				mc1 = Math.floor(y / 8) * 100 + Math.floor(x / 8);
				if(ArrayIndexOf(vm1, parseInt(mc1)) != -1) {
					mc2 = (y % 8).toString() + (x % 8).toString();
					mc = mc1.toString() + "-" + mc2.toString();
					meshBounds[mc] = meshcode2LatLngBounds(mc);
				}
			}
		}
	}
	else {
		// primary mesh
		for(i in vm1) {
			mc = vm1[i].toString();
			meshBounds[mc] = meshcode2LatLngBounds(mc);
		}
	}

	for(i in meshBounds) {
		div_mesh = document.createElement("div");
		div_mesh.className = "mesh";

		var ne = this.getProjection().fromLatLngToDivPixel(meshBounds[i].getNorthEast());
		var sw = this.getProjection().fromLatLngToDivPixel(meshBounds[i].getSouthWest());

		if(isMSIE) d = 1;
		else d = -1;

		div_mesh.style.left = sw.x + 'px';
		div_mesh.style.top = ne.y + 'px';
		div_mesh.style.width = (ne.x - sw.x + d) + 'px';
		div_mesh.style.height = (sw.y - ne.y + d) + 'px';
		if(zoom > 5) div_mesh.innerHTML = '<div style="padding-top:' + Math.floor((sw.y - ne.y - 12) / 2) + 'px">' + i + '</div>';
//		if((parseInt(i.substr(1, 1)) + parseInt(i.substr(3, 1))) % 2) div_mesh.style.backgroundColor = 'lightgray';

		overlayLayer.appendChild(div_mesh);
	}
}
MeshMap.prototype.remove = function() {
	if(this.getPanes() == undefined) return;

	overlayLayer = this.getPanes().overlayLayer;
	while(overlayLayer.hasChildNodes()) overlayLayer.removeChild(overlayLayer.firstChild);
}


// initialize function
function init() {
	if(exportKML_enabled) {
		var elm = document.createElement('script');
		elm.type = 'text/javascript';
		elm.src = "kml_export.js";
		document.getElementsByTagName("head").item(0).appendChild(elm);
	}

	map = new google.maps.Map(
		document.getElementById("map_canvas"), {
		zoom: 5,
		center: new google.maps.LatLng(36.208823,138.251953),
		mapTypeControlOptions: {
			mapTypeIds: [google.maps.MapTypeId.TERRAIN, google.maps.MapTypeId.ROADMAP, google.maps.MapTypeId.SATELLITE, "kiban25000"]
		},
		mapTypeId: google.maps.MapTypeId.TERRAIN,
		streetViewControl: false
	});
	map.mapTypes.set("kiban25000", kiban25000MapType);
	meshMap = new MeshMap(map);

	google.maps.event.addListener(map, "maptypeid_changed", onMapTypeIdChanged);
	google.maps.event.addListener(map, "bounds_changed", onBoundsChanged);
	google.maps.event.addListener(map, "click", function(event) {
		meshcode = LatLng2meshcode(event.latLng);
		zoom = map.getZoom();
		if(zoom > 12) showMeshCode(meshcode);
		else if(zoom > 9) showMeshCode(meshcode.substr(0, 6));
		else showMeshCode(meshcode.substr(0, 4));
	});

	geocoder = new google.maps.Geocoder();

	// jump to the mesh extent of specified code
	var meshcode = window.location.hash.substring(1);
	if (meshcode) jumpToMeshCode(meshcode);
}

// event handlers
function onMapTypeIdChanged() {
	mapTypeId = map.getMapTypeId();
	if(mapTypeId == "kiban25000") {
		map.overlayMapTypes.insertAt(0, chimeiMapType);
	}
	else {
		map.overlayMapTypes.clear();
	}
}

function onBoundsChanged() {
	// clear InfoWindows
	for(i = 0; i < infowindows.length; i++) {
		infowindows[i].close();
	}
	infowindows = [];

	// draw mesh
	meshMap.draw();
}

function onClickedExportKML(meshcode) {
	exportKML([meshcode]);
}

function onBoundsClicked(obj) {
	vals = obj.firstChild.innerHTML.split(",");		// .bounds
	if(obj.lastChild.innerHTML.indexOf("°") != -1) {		// .text
		sw = "(" + vals[0] + ", " + vals[1] + ")";
		ne = "(" + vals[2] + ", " + vals[3] + ")";
		bounds_style = 0;
	}
	else {
		sw = "(" + deg2dms(vals[0]) + ", " + deg2dms(vals[1]) + ")";
		ne = "(" + deg2dms(vals[2]) + ", " + deg2dms(vals[3]) + ")";
		bounds_style = 1;
	}
	obj.lastChild.innerHTML = "NE: " + ne + "<br>SW: " + sw;		// .text
}

// popup information window
function showMeshCode(meshcode) {
	bounds = meshcode2LatLngBounds(meshcode);
	urlValue = bounds.toUrlValue(8);
	vals = urlValue.split(",");

	if(bounds_style == 0) {
		sw = "(" + vals[0] + ", " + vals[1] + ")";
		ne = "(" + vals[2] + ", " + vals[3] + ")";
	}
	else {
		sw = "(" + deg2dms(vals[0]) + ", " + deg2dms(vals[1]) + ")";
		ne = "(" + deg2dms(vals[2]) + ", " + deg2dms(vals[3]) + ")";
	}
	fMeshcode = formatMeshcode(meshcode);
	contentString = "<div>メッシュコードは<br><span class='meshcode'>" + fMeshcode + "</span></div>";
	contentString += "<div class='bounds' onclick='onBoundsClicked(this)'><span class='bounds'>" + urlValue + "</span><span class='text'>NE: " + ne + "<br>SW: " + sw + "</span></div>";

/*	contentString += "<div style='text-align:right;margin-top:3px;'><a href='meshcode2kml.html?" + fMeshcode + "' target='meshcode2kml' class='viewKML'>[KML表示]</a>";
	if(exportKML_enabled) {
		contentString += " <span class='exportKML' onclick='onClickedExportKML(" + fMeshcode + ")'>[KML保存]</span>";
	}
	contentString += "</div>";*/

	var infowindow = new google.maps.InfoWindow({
		content: contentString,
		position: bounds.getCenter(),
		disableAutoPan: true
	});

	infowindow.open(map);
	infowindows.push(infowindow);
}

// jumping functions
function jumpToAddress(address) {
	if(typeof address == "undefined") address = document.getElementById("address_box").value;
	geocoder.geocode( {"address": address}, function(results, status) {
		if (status == google.maps.GeocoderStatus.OK) {
			map.setCenter(results[0].geometry.location);
			map.setZoom(12);

			if(marker) marker.setMap(null);
			marker = new google.maps.Marker({
				animation: google.maps.Animation.DROP,
				map: map,
				position: results[0].geometry.location,
				title: address
			});
		} else {
			alert("ジオコードに失敗しました。: " + status);
		}
	});
}

function jumpToMeshCode(meshcode) {
	if(typeof meshcode == "undefined") meshcode = document.getElementById("meshcode_box").value;
	mc = meshcode.toString().split("-").join("");
	if(!checkCode(mc)) return;

	mcl2zoom = {4:9,6:12,8:15};
	map.setZoom(mcl2zoom[mc.length]);
	map.setCenter(meshcode2LatLngBounds(mc).getCenter());

	setTimeout("showMeshCode('"+mc+"')",500);
}
