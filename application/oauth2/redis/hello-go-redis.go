package main

import "fmt"
import "github.com/garyburd/redigo/redis"

func main() {
//INIT OMIT
c, err := redis.Dial("tcp", "neopostlabs.61lrgx.ng.0001.euw1.cache.amazonaws.com:6379")
if err != nil {
panic(err)
}
defer c.Close()

//set
c.Do("SET", "message1", "Hello World")

//get
world, err := redis.String(c.Do("GET", "message1"))
if err != nil {
fmt.Println("key not found")
}

fmt.Println(world)
//ENDINIT OMIT
}
