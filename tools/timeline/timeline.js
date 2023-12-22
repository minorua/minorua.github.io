var settings;
var initialVisibleRecords = 50;
var storage_prefix = 'tl_';
var storageList = new localStorageList(storage_prefix);
var editting_index = null;
var textUpdated = false;

var isSettingPage = false;
var geo_position=null;
var statusTimer=null;

var uploadList = [];
var numUploaded, numUploadError;
// var progressBar;

var ready=false;
var query;	// for debug

function onLoad() {
  /// 設定の読込
  var str = localStorage['settings'];
  if(str == null) {
    $('#timeline').text('設定ページで初期設定を行なってください。');
    return;
  }
  settings = JSON.parse(str);

  document.title = settings.pageTitle;
  $('.title').html('<a href="./">' + settings.pageTitle + '</a>');

  // initialize input box
  init_inputbox();
  window.location.hash.substring(1).split('&').forEach(function (param) {
    var p = param.split('=');
    if (p[0] == 't') $('#inputbox').val(decodeURIComponent(p[1]));
  });

  // update list
  update_timeline();
  // updateLocation();
}

function onRButton() {
  if (uploadList.length > 0) {
    // previous uploading has not finished
    status('前回のアップロードがまだ完了していません');
    return;
  }

  upload_records(0, update_timeline);
}

function conceal() {
  var header_height = $('.header').height();
  $('#blind').css('top',header_height+'px');
  $('#blind').css('width',$(document).width()+'px');
  $('#blind').css('height',($(document).height()-header_height)+'px');

  $('.rbutton').text('表示');
  $('#blind').fadeIn();
}

function remove_blind() {
  $('.rbutton').text('隠す');
  $('#blind').css('display','none');
}

function on_keydown() {
  if(event.keyCode==13) {
    if(event.ctrlKey || event.shiftKey) {
      if($('#blind').css('display')=='none') conceal();
      else remove_blind();
      return false;
    }
    else {
      if($('#logbutton').attr('disabled')!='disabled') enter();
      return false;
    }
  }
  else if(event.ctrlKey || event.shiftKey) {
    if(event.keyCode == 8 || event.keyCode == 38 || event.keyCode == 40) {
      if(editting_index == null && $('#inputbox').val() != '') return true;
      if(textUpdated && !confirm('変更が破棄されます。フォーカスを移動しますか?')) return true;

      inc = (event.keyCode==38)?1:-1;
      itemCount = storageList.count();
      if(editting_index == null) editting_index = itemCount;

      for(i = editting_index + inc; 0 <= i && i < itemCount; i += inc) {
      	data = storageList.get(i);
      	if(data.status != 0) return edit_record(i);
      }

      location.reload();
      return false;
    }

  }

  return true;
}

function on_keypress() {
  textUpdated = true;

  // TODO 日本語入力ではkeypressイベントが発生しない。
}

function update_timeline() {
  $('#timeline').html('');
  var index = storageList.count() - 1, num_listitem = 0;
  while(index >= 0) {
    var row = storageList.get(index);
    if(row.status != 0) {
      var editstr = '';
      if (row.imported == 0) {
        editstr = '<a href="#" class="edit">変更</a> | <a href="#" class="remove">削除</a>';
      }

      var stts = '';
      if(row.status > 1) stts+='<span class="star">☆</span>';
      if(row.exported != 0) stts+='<span class="status">[exported]</span>';
      if(row.imported != 0) stts+='<span class="status">[online]</span>';

      $('#timeline').append('<li id="li'+index+'"><input type="checkbox" class="check" name="check" value="'+index+'">'+row.ts+' <span class="itemtext">'+row.text+'</span> '+editstr+stts+'</li>');
      num_listitem++;
      if(initialVisibleRecords == num_listitem) break;
    }
    index--;
  }

  $('a.edit').click(function() {
    return edit_record($(this).parent().attr('id').substr(2));
  });

  $('a.remove').click(function() {
    var listitem = $(this).parent();
    if(confirm('"' + $('.itemtext', listitem).text() + '"を削除してもよろしいですか?')) {
      remove_record(listitem.attr('id').substr(2));
      update_timeline();
    }
    return false;
  });

  $('#timeline .itemtext').dblclick(onItemFocused);

  ready = true;
  $('#logbutton').removeAttr('disabled');

  itemCount = storageList.count();
  recordcount = itemCount+' 件のメモ';
  if(initialVisibleRecords>0 && itemCount > initialVisibleRecords) {
    $('#timeline').append('<li style="text-align:center;cursor:pointer;background-color:#CCCCFF;" onclick="initialVisibleRecords=0; update_timeline()">すべて表示</li>');
    recordcount += ' ('+initialVisibleRecords+'件を表示)';
  }
  $('#recordcount').html(recordcount);
}

function onItemFocused() {
  var listitem = $(this).parent();
  idx = listitem.attr('id').substr(2);
  item = storageList.get(idx);
  if(item.exported != 0 || item.imported != 0) return;

  edit_record(idx);
}

function init_inputbox() {
  editting_index = null;
  textUpdated = false;
  $('#inputbox').val('');
  $('#boxlabel').html('いまどうしてる？');
  $('#time').html('');
  $('#time').css('display','none');
  $('#logbutton').val('記録');
  status('');

  $('#inputbox').focus();
}

function enter() {
  if(ready==false) return;

  var ts=$('#time').html();
  var text=$('#inputbox').val();

  if(geo_position!=null) {
    if($('#geoloc').attr('checked')) text+=' #LOC:N'+geo_position.coords.latitude+',E'+geo_position.coords.longitude;
  }
  if(text=='') return;

  ready=false;
  $('#logbutton').attr('disabled','disabled');

  if(editting_index===null) {
    data = {ts: now(), text: text, status: 1, exported: 0, imported: 0};
    storageList.add(data);
  }
  else {
    data = storageList.get(editting_index);
    data.text = text;
    storageList.set(editting_index,data);
  }

  init_inputbox();
  update_timeline();

  // TODO: 同期中にメモされた場合にダウンロードによって投稿したメモが削除されるので
  // メモのダウンロードが行われないようにする。

  if(settings.AutoUpload) {
    if (uploadList.length > 0) return;    // previous uploading has not finished

    upload_records(settings.UploadMinPassedSec, function () {
      status('');
      update_timeline();
    });
  }
  return false;
}

function edit_record(idx) {
  $('#timeline .focused').removeClass('focused');

  editting_index = idx;
  textUpdated = false;
  item = storageList.get(idx);

  $('#li'+idx).addClass('focused');
  $('#boxlabel').html('メモ変更中です...');
  $('#time').html(item.ts);
  $('#time').css('display','block')
  $('#inputbox').val(item.text);
  $('#logbutton').val('変更');
  $('#inputbox').focus();
  return false;
}

function start_edit_last_record() {
  for(var i = storageList.count() - 1; i >= 0; i--) {
    data = storageList.get(i);
    if(data.status != 0) return edit_record(i);
  }
}

function select_allitems() {
  var boxes=document.listform.check;
  if(boxes.length==undefined) {
    boxes.checked=true;
  }
  else if(boxes.length>0) {
    for(i=0;i<boxes.length;i++) {
      boxes[i].checked=true;
    }
  }
}

function remove_selections() {
  var i,ts,boxes=document.listform.check;

  $("input[type='checkbox']:checked").each(function() {
    remove_record($(this).val());
  });

  init_inputbox();
  update_timeline();
}

function remove_record(index) {
  storageList.remove(index);
}

// synchronize
function sync() {
  close_menu();
  upload_records(0, function () {
    storageList.clear();
    update_timeline();
    download_records();
  });
}

function str2date(str) {
  var a = str.split(/[- :]/);
  return new Date(a[0], a[1]-1, a[2], a[3], a[4], a[5]);
}

function upload_records(minimum_passed_time, successCallback) {
  minimum_passed_time = minimum_passed_time || 0;
  var now = new Date();

  uploadList = [];
  numUploaded = numUploadError= 0;

  var itemCount = storageList.count();
  for(var i = 0; i < itemCount; i++) {
    var data = storageList.get(i);
    if(data.status != 0 && data.exported == 0 && data.imported == 0) {
      if ((now - str2date(data.ts)) / 1000 >= minimum_passed_time) uploadList.push({index:i, ts:data.ts, text:data.text});
    }
  }

  var numUpload = uploadList.length;
  if (numUpload == 0) {
    status('アップロードされていないメモはありません.', 3000);
    if(successCallback) successCallback();
    return;
  }

  status(numUpload + '件の未アップロードメモをアップロードしています.');

  console.log("uploading...");

  $.ajax({
    type: 'POST',
    url: settings.URL,
    contentType: 'application/json; charset=utf-8',
    data: JSON.stringify({
      action: "add",
      data: uploadList
    }),
    dataType: 'json',
    success: function(result) {
      console.log(result);
      if (result.status == 200) {
        var index, record;
        // set exported flag to 1
        for(var i = 0; i < uploadList.length; i++) {
          index = uploadList[i].index;
          data = storageList.get(index);
          data.exported = 1;
          storageList.set(index, data);
        }
      }
      uploadList = [];
      if(successCallback) successCallback();
      status(result.msg, 5000);
    },
    error: function(XMLHttpRequest, textStatus, errorThrown) {
      var baseUrl = settings.URL.split("/").slice(0, 3).join("/");
      status("<div>エラー: " + textStatus + "</div><div><a href='" + baseUrl + "'>" + baseUrl + "</a></div>",
             10000, true)
    }
  });
}

function download_records() {
  /*
  var p = [];
  var type = [];
  if(settings.SyncType.memo) type.push(1);
  if(settings.SyncType.link) type.push(2);
  if(type.length > 0) p.push('type=' + type.join(','));

  if(settings.SyncRecentDay) p.push('recent=' + settings.SyncRecentDay);
  if(settings.SyncStar) p.push('star');
  */

  var msg = $('#status').text();
  if (msg) msg = ' (' + msg + ')';
  status('ダウンロード中です.' + msg);


  $.ajax({
    type: 'GET',
    url: settings.URL,
    data: {
      days: settings.SyncRecentDay || 0,
    },
    dataType: 'json',
    success: function(result) {

      storageList.clear();

      try {
        status(result.length + '件のメモをダウンロードしました.');

        for(var i = 0; i < result.length; i++) {
          result[i].imported = 1;
          result[i].exported = 0;
          storageList.add(result[i]);
        }

        if(result.length == 0) status('ダウンロードされたメモはありません.');
        else status('同期が完了しました.');
      } catch(e) {
        console.log(httpObj.responseText);
        alert(e);
      }

      update_timeline();
    },
    error: function(XMLHttpRequest, textStatus, errorThrown) {
      status("エラー: " + textStatus, 10000)
    }
  });
}


// common functions
function popup_menu() {
  $('#popupmenu').css('display','block');
  $('#popupmenu').css('top',$('.header').height()+'px');
}

function close_menu() {
  $('#popupmenu').css('display','none');
}

function status(msg, duration, isHtml) {
  var statusdiv = $('#status');
  if(statusTimer != null) {
    clearTimeout(statusTimer);
    statusTimer = null;
  }

  if(msg == '') {
    statusdiv.hide();
    statusdiv.text('');
  }
  else {
    if (isHtml) statusdiv.html(msg);
    else statusdiv.text(msg);
    statusdiv.show();

    if (duration) {
      statusTimer = setTimeout(function() {
      	statusdiv.hide();
      	statusdiv.text('');
      }, duration);
    }
  }
}

function now() {
  Now=new Date();
  year=Now.getFullYear();
  month=Now.getMonth()+1;
  day=Now.getDate();
  hour=Now.getHours();
  minute=Now.getMinutes();
  second=Now.getSeconds();

  if(month<10) month='0'+month;
  if(day<10) day='0'+day;
  if(hour<10) hour='0'+hour;
  if(minute<10) minute='0'+minute;
  if(second<10) second='0'+second;

  return year+'-'+month+'-'+day+' '+hour+':'+minute+':'+second;
}

function updateLocation() {
  geo_position=null;
  $('#td_geo').html('');
  navigator.geolocation.getCurrentPosition(function(position) {
    $('#td_geo').html('<input type="checkbox" name="geoloc" id="geoloc"><span id="geoloctext">位置情報を付加する. N:'+position.coords.latitude+' E:'+position.coords.longitude+'</span> <a href="#" onclick="updateLocation();return FALSE;">位置の更新</a>');
    geo_position=position;
  },function(err) {
    $('#td_geo').html('<div style="font-size:xx-small;color:lightgray;" align="left">位置情報が取得できません.('+err.message+')</div>');
  },{maximumAge:5000});
}


// stop watch - http://jsdo.it/kikuchy/6tH0
var tid = null;
var sec = 0;

function stopwatch_button1() {
  if(tid) stopwatch_stop();
  else stopwatch_start();
}

function stopwatch_button2(){
  sec = 0;
  document.getElementById("disp").innerHTML = sec;
}

function stopwatch_start(){
  // initialize
  var button = document.getElementById("sw_button1");

  tid = setInterval(stopwatch_updateTimer, 20);
  button.value = "STOP";
}

function stopwatch_updateTimer(){
  document.getElementById("disp").innerHTML = sec/50;
  sec++;
}

function stopwatch_stop(){
  clearInterval(tid);
  tid = null;
  var button = document.getElementById("sw_button1");
  button.value = "START";
}

// 3 minutes timer
var tid2 = null;

function timer_button1() {
  if(tid2) timer_clear();
  else timer_start();
}

function timer_start() {
  document.getElementById("tm_button1").value = 'CANCEL';
  tid2 = setTimeout(timer_finish, 180000);
}

function timer_clear() {
  clearTimeout(tid2);
  tid2 = null;
  document.getElementById("tm_button1").value = 'START';
}

function timer_finish() {
  document.getElementById("tm_button1").value = 'START';
  alert('3分経過しました');
}
