const fish = Object.freeze({0:"青魚", 1:"白魚", 2:"黑魚", 3:"紅魚"})
const fishPhotos = [
    "0",
    "1",
    "2",
    "3"
]
const LEFT = "left";
const RIGHT = "right";
const EVENT_MESSAGE = "message" //發言
const EVENT_OTHER = "other"     //通知

var url = "ws://" + window.location.host + "/ws";
var ws = new WebSocket(url);
var myid = -1;
var myfish;
var fish_img;
var total_id;
var chatroom = document.getElementsByClassName("msger-chat");
var text = document.getElementById("msg");
var send = document.getElementById("send");


/* 事件：iam, set, dis, chat
    iam為連線事件, set為設定位置事件, dis為離線事件 
    chat為新增的聊天訊息事件
*/
/* 也負責更新更新其他client狀態*/
/* 無事件時待機*/
ws.onmessage = function (msg) {
  var cmds = {"iam": iam, "set": set, "dis": dis/*, "chat": chat*/};
  //console.log("cmds: "+ cmds +"\n")
  //供後續cmd取得當前事件對應的事件function，可視為一個function array
  if (msg.data) {
    //console.log("msg.data: "+msg.data +"\n") // print iam id
    var parts = msg.data.split(" ") // "command id ... x y" -> [command, id, x, y]
    var cmd = cmds[parts[0]];
    console.log("cmd: "+cmd)
    //從cmds裡面取command值，可能是iam(id), set(id, x, y), dis(id), chat()

    if (cmd) {
      var tmp = parts.slice(1)
      //將parts中的command去除掉，留下後續的陣列值，此處parts不會被更動
      //console.log("tmp: "+tmp)
      cmd.apply(null, tmp/*parts.slice(1)*/);
      //執行cmd, 同時帶入對應的參數
    }// else {
      //chat(msg);
      //執行cmd, 同時帶入對應的參數
    //}
  }
}

//client端的滑鼠移動事件
window.onmousemove = function (e) {
  if (myid > -1) {  //iam初始化完成才開始更新
    set(myid, e.pageX, e.pageY);
    ws.send([e.pageX, e.pageY].join(" ")); //供mrouter.HandleMessage使用，座標播送給其他client
  }
}
/*
//client端的send按鈕發送事件
send.onclick = function (e) {
  handleMessageEvent()
}
//client端的enter鍵發送事件
text.onkeydown = function (e) {
    if (e.keyCode === 13) {
        handleMessageEvent()
    }
}
*/
function iam(id, ...total) {
  myid = id;
  total_id = total;
  fish_id = Math.floor(Math.random() * 1000) % fishPhotos.length;
  total_id[fish_id]++; 
  console.log("myid: "+myid+", total: "+total_id)
  /*以亂數建立起myfish的編號，並且將對應編號加入total的計數*/
  myfish = fish[fish_id] + total_id[fish_id] +"號" ;//0~3
  fish_img = fishPhotos[fish_id];
  console.log("myfish: "+myfish)
  ws.send(total_id.join(" ")); //供mrouter.HandleMessage使用，魚種數量播送給其他client
}

function set(id, x, y) {
  var node = document.getElementById("gopher-" + id);
  if (!node) { //建立圖形物件
    var id_index = parseInt(id, 10)+1;
    node = document.createElement("div");
    document.body.appendChild(node);
    node.className = "gopher";
    node.style.zIndex = id_index.toString();
    node.id = "gopher-" + id;
  }
  node.style.left = x + "px";
  node.style.top = y + "px";
}

function dis(id) {
  var node = document.getElementById("gopher-" + id);
  if (node) {
    document.body.removeChild(node); //刪除圖形物件
  }
}
/*
function chat(e) {
  var m = JSON.parse(e.data)
  var msg = ""
  switch (m.event) {
      case EVENT_MESSAGE:
          if (m.name == PERSON_NAME) {
              msg = getMessage(m.name, m.photo, RIGHT, m.content);
          } else {
              msg = getMessage(m.name, m.photo, LEFT, m.content);
          }
          break;
      case EVENT_OTHER:
          //if (m.name != PERSON_NAME) {
              msg = getEventMessage(m.name + m.content)
          //} else {
          //    msg = getEventMessage("您已" + m.content)
          //}
          break;
  }
  insertMsg(msg, chatroom[0]);
  console.log(m.name + ":" + m.content)
}
*/
function handleMessageEvent() {
    if(text.value == "") return;
    ws.send(JSON.stringify({
        "event": "message",
        "photo": fish_img,
        "name": myfish,
        "content": text.value
    }));
    text.value = "";
}

function getEventMessage(msg) {
    var msg = `<div class="msg-left">${msg}</div>`
    return msg
}

function getMessage(name, img, side, text) {
    const d = new Date()
    //   Simple solution for small apps
    var msg = `
    <div class="msg ${side}-msg">
      <div class="msg-img" style="background-image: url(${img})"></div>

      <div class="msg-bubble">
        <div class="msg-info">
          <div class="msg-info-name">${name}</div>
          <div class="msg-info-time">${d.getHours()}:${d.getMinutes()}</div>
        </div>

        <div class="msg-text">${text}</div>
      </div>
    </div>
  `
    return msg;
}

function insertMsg(msg, domObj) {
    domObj.insertAdjacentHTML("beforeend", msg);
    domObj.scrollTop += 500;
}