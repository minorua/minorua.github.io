/*   mesh.js - 
*    Copyright (C) 2012 Minoru Akagi
*
*    This program is free software: you can redistribute it and/or modify
*    it under the terms of the GNU General Public License as published by
*    the Free Software Foundation, either version 3 of the License, or
*    (at your option) any later version.
*
*    This program is distributed in the hope that it will be useful,
*    but WITHOUT ANY WARRANTY; without even the implied warranty of
*    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
*    GNU General Public License for more details.
*
*    You should have received a copy of the GNU General Public License
*    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
var mesh1st_list = {30:[36],36:[22,23,24,31,41,53],37:[24,25,41],38:[31,41],39:[26,27,28,42],40:[27,28,40,42],41:[28,29,42],42:[29,30],43:[28,29],44:[29,40],45:[29,30,31,40],46:[29,30,31],47:[28,29,30,31,39,40],48:[28,29,30,31,39],49:[28,29,30,31,32,33,34,39],50:[29,30,31,32,33,34,35,36,38,39],51:[29,30,31,32,33,34,35,36,37,38,39],52:[29,31,32,33,34,35,36,37,38,39,40],53:[32,33,34,35,36,37,38,39,40],54:[32,33,35,36,37,38,39,40],55:[36,37,38,39,40,41],56:[36,37,38,39,40,41],57:[38,39,40,41],58:[39,40,41],59:[39,40,41,42],60:[39,40,41],61:[39,40,41],62:[39,40,41,43],63:[39,40,41,42,43],64:[39,40,41,42,43,44,45],65:[40,41,42,43,44,45],66:[41,42,43,44,45],67:[41,42],68:[40,41,42]};

function MyLatLng(lat, lng) {
	this.lat = lat;
	this.lng = lng;
}

MyLatLng.prototype.lat = function() {
	return this.lat;
}

MyLatLng.prototype.lng = function() {
	return this.lng;
}

function MyLatLngBounds(south, west, north, east) {
	this.south = south;
	this.west = west;
	this.north = north;
	this.east = east;
}

MyLatLngBounds.prototype.toString = function() {
	return "((" + this.south + ", " + this.west + "), (" + this.north + ", " + this.east + "))";
}

function LatLng2meshcode(ll) {
	lat = ll.lat();
	lng = ll.lng();

	y1 = Math.floor(lat * 1.5);
	x1 = Math.floor(lng) - 100;
	lat1_0 = y1 / 1.5;
	lng1_0 = x1 + 100;
	y2 = Math.floor((lat-lat1_0) * 1.5 * 80);
	x2 = Math.floor((lng-lng1_0) * 80);

	m1 = y1.toString() + x1.toString();
	m2 = Math.floor(y2 / 10).toString() + Math.floor(x2 / 10).toString();
	m3 = (y2 % 10).toString() + (x2 % 10).toString();
	return [m1,m2,m3].join("");
}

function meshcode2LatLngBounds(meshcode) {
	mc = meshcode.toString().split("-").join("");
	mcl = mc.length;

	if(mcl == 4) {
		south_sec = parseInt(mc.substr(0,2)) * 2400;
		south = south_sec / 3600;
		west = parseInt(mc.substr(2,2)) + 100;
		north = (south_sec + 2400) / 3600;
		east = west + 1;
	}
	else {
		south_sec = parseInt(mc.substr(0,2)) * 2400 + parseInt(mc.substr(4,1)) * 300;
		west_sec = (parseInt(mc.substr(2,2)) + 100) * 3600 + parseInt(mc.substr(5,1)) * 450;

		if(mcl == 6) {
			north_sec = south_sec + 300;
			east_sec = west_sec + 450;
		}
		else {
			south_sec += parseInt(mc.substr(6,1)) * 30;
			west_sec += parseInt(mc.substr(7,1)) * 45;
			north_sec = south_sec + 30;
			east_sec = west_sec + 45;
		}
		
		south = south_sec / 3600;
		west = west_sec / 3600;
		north = north_sec / 3600;
		east = east_sec / 3600;
	}

	if(typeof google == "undefined") {
		return new MyLatLngBounds(south, west, north, east);
	}
	else {
		return new google.maps.LatLngBounds(new google.maps.LatLng(south,west), new google.maps.LatLng(north,east));
	}
}

function isMeshCodeExists(meshcode) {	//
	y = parseInt(meshcode.substr(0,2));
	x = parseInt(meshcode.substr(2,2));

	if(mesh1st_list[y] && ArrayIndexOf(mesh1st_list[y], x) != -1) return true;
//	if(mesh1st_list[y] && mesh1st_list[y].indexOf(x) != -1) return true;
	return false;
}

function checkCode(meshcode) {
	mc = meshcode.split("-").join("");
	mcl = mc.length;

	if(mc.match(/[0-9]+/g) != mc) {
		alert("メッシュコードに数字とハイフン以外の文字が含まれています");
		return false;
	}

	if(ArrayIndexOf([4,6,8], mcl) == -1) {
		alert("メッシュコードの桁数が正しくありません。対応メッシュは一次から三次までです");
		return false;
	}

	if(mcl > 4 && Math.max(parseInt(mc.substr(4,1)), parseInt(mc.substr(5,1))) > 7) {
		alert("2次メッシュコードが正しくありません");
		return false;
	}
	return true;
}

function formatMeshcode(meshcode) {
	meshcode = meshcode.split("-").join("");
	if(meshcode.length == 4) return meshcode;
	if(meshcode.length == 6) return [meshcode.substr(0,4),meshcode.substr(4,2)].join("-");
	if(meshcode.length == 8) return [meshcode.substr(0,4),meshcode.substr(4,2),meshcode.substr(6,2)].join("-");
}

function deg2dms(deg) {
	dms = deg2dmsA(deg);
	return dms[0] + "°" + dms[1] + "′" + dms[2] + "″";
}

function deg2dmsA(deg) {
	deg = parseFloat(deg) + 0.00000001;
	d = parseInt(deg);
	dps = parseInt((deg - d) * 3600);
	m = parseInt(dps / 60);
	s = dps % 60;
	return [d,m,s];
}

function ArrayIndexOf(a, o) {
	for(var i in a) {
		if(a[i] == o) return i;
	}
	return -1;
}
/*
// for IE
if(!Array.indexOf) {
	Array.prototype.indexOf = function(o) {
		for(var i in this) {
			if(this[i] == o) return i;
		}
		return -1;
	}
}
*/
