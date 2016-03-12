var map, geocoder;
var rectangles = [], infowindows = [];
var mesh1st = {30:[36],36:[22,23,24,31,41,53],37:[24,25,41],38:[23,24,31,41],39:[26,27,28,42],40:[27,28,40,42],41:[28,29,42],42:[29,30],43:[28,29],44:[29,40],45:[29,30,31,40],46:[29,30,31],47:[28,29,30,31,39,40],48:[28,29,30,31,39],49:[28,29,30,31,32,33,34,39],50:[29,30,31,32,33,34,35,36,38,39],51:[29,30,31,32,33,34,35,36,37,38,39],52:[29,31,32,33,34,35,36,37,38,39,40],53:[32,33,34,35,36,37,38,39,40],54:[32,33,35,36,37,38,39,40],55:[31,36,37,38,39,40,41],56:[36,37,38,39,40,41],57:[38,39,40,41],58:[39,40,41],59:[39,40,41,42],60:[39,40,41],61:[39,40,41],62:[39,40,41,43],63:[39,40,41,42,43],64:[39,40,41,42,43,44,45],65:[40,41,42,43,44,45,46],66:[41,42,43,44,45,46,47],67:[41,42,47,48],68:[40,41,42,47,48]};
var marker = null;

function init() {
	onResize();		//
	window.onresize = onResize;

	map = new google.maps.Map(
		document.getElementById("map_canvas"), {
		zoom: 5,
		center: new google.maps.LatLng(36.208823,138.251953),
		mapTypeControlOptions: {
			mapTypeIds: [google.maps.MapTypeId.ROADMAP, google.maps.MapTypeId.SATELLITE]	// google.maps.MapTypeId.TERRAIN
		},
		mapTypeId: google.maps.MapTypeId.ROADMAP,
		streetViewControl: false
	});

	google.maps.event.addListener(map, "bounds_changed", onBoundsChanged);
	geocoder = new google.maps.Geocoder();
}

function onResize() {
	var userAgent = window.navigator.userAgent.toLowerCase();
	if(userAgent.indexOf("msie") != -1) {
		$(".rightpane").width(($(window).width()-240) + "px");
	}
	$("#map_canvas,#bodytable").height(($(window).height() - $("#bodytable").offset().top - 20) + "px");	//
}

function onBoundsChanged() {
	zoom = map.getZoom();
	center = map.getCenter();

	meshcode = LatLng2meshcode(center);

	if(isMeshCodeExists(meshcode)) {
		$("#meshcode1").html(meshcode.substr(0,4));
		$("#meshcode2").html(meshcode.substr(4,2));
		$("#meshcode3").html(meshcode.substr(6,2));
	}
	else {
		$("#meshcode1,#meshcode2,#meshcode3").html("");
	}

	bounds = map.getBounds();
	m_sw = LatLng2meshcode(bounds.getSouthWest());
	m_ne = LatLng2meshcode(bounds.getNorthEast());

	$("#debug").html("bounds:"+bounds.toString() + "<br>zoom:" + map.getZoom()+"<br>");
	$("#debug").append("mesh range:" + m_sw + " - " + m_ne + "<br>");

	y1 = Math.max(30,parseInt(m_sw.substr(0,2)));
	x1 = Math.max(22,parseInt(m_sw.substr(2,2)));
	y2 = Math.min(68,parseInt(m_ne.substr(0,2)));
	x2 = Math.min(53,parseInt(m_ne.substr(2,2)));

	mb = [];
	// 1次メッシュ
	if(zoom > 3) {
		for(y = y1; y <= y2; y++) {
			for(x = x1; x <= x2; x++) {
				mc = (y*100+x).toString();
				if(isMeshCodeExists(mc)) mb[mc] = meshcode2LatLngBounds(mc);
			}
		}
	}

	// 2次メッシュ
	if(zoom > 9) {
		y1 = parseInt(m_sw.substr(0,2)) * 8 + parseInt(m_sw.substr(4,1));
		x1 = parseInt(m_sw.substr(2,2)) * 8 + parseInt(m_sw.substr(5,1));
		y2 = parseInt(m_ne.substr(0,2)) * 8 + parseInt(m_ne.substr(4,1));
		x2 = parseInt(m_ne.substr(2,2)) * 8 + parseInt(m_ne.substr(5,1));

		// TODO 1次メッシュの存在チェック
		for(y = y1; y <= y2; y++) {
			for(x = x1; x <= x2; x++) {
				mc1 = Math.floor(y / 8) * 100 + Math.floor(x / 8);
				mc2 = (y % 8).toString() + (x % 8).toString();
				mc = mc1.toString() + "-" + mc2.toString();
				mb[mc] = meshcode2LatLngBounds(mc);
			}
		}
	}

	// 3次メッシュ
	if(zoom > 12) {
		y1 = parseInt(m_sw.substr(0,2)) * 80 + parseInt(m_sw.substr(4,1)) * 10 + parseInt(m_sw.substr(6,1));
		x1 = parseInt(m_sw.substr(2,2)) * 80 + parseInt(m_sw.substr(5,1)) * 10 + parseInt(m_sw.substr(7,1));
		y2 = parseInt(m_ne.substr(0,2)) * 80 + parseInt(m_ne.substr(4,1)) * 10 + parseInt(m_ne.substr(6,1));
		x2 = parseInt(m_ne.substr(2,2)) * 80 + parseInt(m_ne.substr(5,1)) * 10 + parseInt(m_ne.substr(7,1));

		// TODO 1次メッシュの存在チェック

		for(y = y1; y <= y2; y++) {
			for(x = x1; x <= x2; x++) {
				mc1_x = Math.floor(x / 80);
				mc1_y = Math.floor(y / 80);
				mc1 =  mc1_y * 100 + mc1_x;
				mc2 = Math.floor((y - mc1_y * 80) / 10).toString() + Math.floor((x - mc1_x * 80) / 10).toString();
				mc3 = (y % 10).toString() + (x % 10).toString();
				mc = mc1.toString() + "-" + mc2.toString() + "-" + mc3.toString();
				mb[mc] = meshcode2LatLngBounds(mc);
			}
		}
	}

	for(i = 0; i < rectangles.length; i++) {
		rectangles[i].setMap(null);
	}

	for(i = 0; i < infowindows.length; i++) {
		infowindows[i].close();
	}

	/*
	if(marker) marker.setMap(null);
	marker = new google.maps.Marker({
			map: map,
			position: center
		});
	*/

	rectangles = [];
	infowindows = [];
	num_mb = 0;
	for(i in mb) {
		zIndex = i.length;
		strokeWeight = 3;
		if(i.length == 4) strokeColor = "blue";
		else if(i.length == 7) strokeColor = "yellow";
		else strokeColor = "lightgreen";

		r = new google.maps.Rectangle({
			map: map, 
			bounds: mb[i],
			fillOpacity: 0.0,
			strokeColor: strokeColor,
			strokeWeight: strokeWeight,
			zIndex: zIndex,
			code: i});
		
		google.maps.event.addListener(r,"mouseover",function() {
			$("#meshcode").html(this.code);
		});

		google.maps.event.addListener(r,"mouseout",function() {
			$("#meshcode").html("");
		});
			
			
		google.maps.event.addListener(r,"click",function() {
//			alert("メッシュコードは " + this.code + " です。");

			contentString = "メッシュコードは<br>" + this.code;
			var infowindow = new google.maps.InfoWindow({
				content: contentString,
				position: this.getBounds().getCenter(),
				disableAutoPan: true
			});

			infowindow.open(map);
			infowindows.push(infowindow);
		});

		rectangles.push(r);
	}

	$("#debug").append("numRectangle:"+rectangles.length);
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
	meshcode = meshcode.toString().split("-").join("");
	mcl = meshcode.length;
	if(mcl < 4 || 8 < mcl) return false;

	south = parseInt(meshcode.substr(0,2)) / 1.5;
	west = parseInt(meshcode.substr(2,2)) + 100;

	if(mcl == 4) {
		north = south + 2 / 3;
		east = west + 1;
	}
	else {
		south += parseInt(meshcode.substr(4,1)) / 12;
		west += parseInt(meshcode.substr(5,1)) / 8;
		
		if(mcl == 6) {
			north = south + 1 / 12;
			east = west + 1 / 8;
		}
		else {
			south += parseInt(meshcode.substr(6,1)) / 120;
			west += parseInt(meshcode.substr(7,1)) / 80;
			north = south + 1 / 120;
			east = west + 1 / 80;
		}
	}

	return new google.maps.LatLngBounds(new google.maps.LatLng(south,west), new google.maps.LatLng(north,east));
}

function isMeshCodeExists(meshcode) {
	y = parseInt(meshcode.substr(0,2));
	x = parseInt(meshcode.substr(2,2));

	if(mesh1st[y]) {
		for(i = 0; i < mesh1st[y].length; i++) {
			if(mesh1st[y][i] == x) return true;
		}
	}
	return false;
}

function jumpToAddress(address) {
	if(typeof address == "undefined") address = document.getElementById("address_box").value;
	geocoder.geocode( {"address": address}, function(results, status) {
		if (status == google.maps.GeocoderStatus.OK) {
			map.setZoom(12);
			map.setCenter(results[0].geometry.location);
		} else {
			alert("Geocode was not successful for the following reason: " + status);
		}
	});
}

function jumpToMeshCode(meshcode) {
	if(typeof meshcode == "undefined") meshcode = document.getElementById("meshcode_box").value;
	mc = meshcode.toString().split("-").join("");
	mcl = mc.length;
	mcl2zoom = {4:9,6:12,8:15};
	if(mcl in mcl2zoom) {
		map.setZoom(mcl2zoom[mcl]);
		center = meshcode2LatLngBounds(mc).getCenter();
		map.setCenter(center);
		
		setTimeout("showMeshCode('"+meshcode+"')",1000);
	}
	else {
		alert("メッシュコードが不正です");
	}
}

function showMeshCode(meshcode) {
	// TODO meshcodeの整形
	contentString = "メッシュコードは<br>" +meshcode ;
	var infowindow = new google.maps.InfoWindow({
		content: contentString,
		position: center,
		disableAutoPan: true
	});

	infowindow.open(map);
	infowindows.push(infowindow);
}
