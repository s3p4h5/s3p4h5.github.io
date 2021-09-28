package main

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"sync"

	"github.com/gin-gonic/gin"
	"gopkg.in/olahol/melody.v1"
)

// GopherInfo contains information about the gopher on screen
type GopherInfo struct {
	ID, FID, X, Y string
}

type Message struct {
	Event   string `json:"event"`
	Id      string `json:"id"`
	Name    string `json:"name"`
	Content string `json:"content"`
}

func NewMessage(event, id, name, content string) *Message {
	return &Message{
		Event:   event,
		Id:      id,
		Name:    name,
		Content: content,
	}
}

//轉換event, name, content給broadcast
func (m *Message) GetByteMessage() []byte {
	result, _ := json.Marshal(m)
	return result
}

func main() {
	router := gin.Default()
	router.LoadHTMLGlob("html/*")
	router.Static("/assets", "./assets")
	mrouter := melody.New()
	gophers := make(map[*melody.Session]*GopherInfo)
	lock := new(sync.Mutex)
	counter := 0
	total := make([]string, 4)           //4對應魚種數量
	total_id := strings.Join(total, " ") //將string array組合起來，間隔為空白方便session傳值
	//chat := []byte("chat ")

	router.GET("/", func(c *gin.Context) {
		http.ServeFile(c.Writer, c.Request, "html/index.html")
	})

	router.GET("/ws", func(c *gin.Context) {
		mrouter.HandleRequest(c.Writer, c.Request)
	})

	/*iam連線事件，建立gophers session*/
	mrouter.HandleConnect(func(s *melody.Session) {
		lock.Lock()
		for _, info := range gophers {
			/*set設定位置事件，只在gopher session初始化執行一次*/
			s.Write([]byte("set " + info.ID + " " + info.FID + " " + info.X + " " + info.Y))
			// "set id X Y"
		}

		//這裡是gophers物件的初始化
		gophers[s] = &GopherInfo{strconv.Itoa(counter), "0", "0", "0"}
		// strconv.Itoa(int) -> int轉為string
		// gophers[s] = struct{"c", "0", "0"} , c=0,1,2,...

		s.Write([]byte("iam " + gophers[s].ID + " " + total_id))
		//iam連線事件
		//這裡根據counter執行session中gophers ID的寫入，在client端創建物件
		//初始座標0,0，但應該馬上就會被client端新進來的滑鼠座標更新

		counter++ //決定下一個gophers session物件的id
		lock.Unlock()
	})
	/*dis離線事件*/
	mrouter.HandleDisconnect(func(s *melody.Session) {
		lock.Lock()
		//id := s.Request.URL.Query().Get("id ")
		//mrouter.Broadcast(NewMessage("other", id, "退出  大水槽共榮圈").GetByteMessage())
		mrouter.BroadcastOthers([]byte("dis "+gophers[s].ID), s)
		delete(gophers, s) //刪除gophers session物件
		lock.Unlock()
	})

	mrouter.HandleMessage(func(s *melody.Session, msg []byte) {
		p := strings.Split(string(msg), " ")
		lock.Lock()
		info := gophers[s]
		if p[0] == "/set" { //針對座標更新去處理
			info.FID = p[1]
			info.X = p[2]
			info.Y = p[3]
			mrouter.BroadcastOthers([]byte("set "+info.ID+" "+info.FID+" "+info.X+" "+info.Y), s)
			//將座標播送給其他client的ws.onmessage處理
		} else if p[0] == "/total" { //針對魚種數量去處理，就只是拿更新完後的結果給下次新的連線事件使用
			total_id = strings.Replace(string(msg), "/total ", "", 1)
		} else { //聊天室
			mrouter.Broadcast(msg)
		}
		lock.Unlock()
	})

	router.Run(":5000") //若拿掉":5000"則以預設8080
}
