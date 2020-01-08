import jxon from "jxon";
import localforage from "localforage";

class Config {
  config = null;
  ready = null;
  constructor() {
   this.loadConfig();
  }

  loadConfig() {
    //console.log('Loading config');
    return this.ready = localforage.getItem('config').then(data => this.config = null === data ? {} : data);
  }

  processXML(xml) {
    jxon.config({attrPrefix: ''});
    const json = jxon.stringToJs(xml);
    let cfg = json.blog_system;

    cfg.locations = Array.isArray(cfg.locations.location)
      ? cfg.locations.location
      : [cfg.locations.location];

    cfg.blogs = Array.isArray(cfg.blogs.blog)
      ? cfg.blogs.blog
      : [cfg.blogs.blog];

    for (let i = 0; i < cfg.blogs.length; i++) {
      cfg.blogs[i].participants = Array.isArray(cfg.blogs[i].participants.participant)
        ? cfg.blogs[i].participants.participant
        : [cfg.blogs[i].participants.participant];
    }

    return localforage.setItem('config', cfg).then(() => this.loadConfig());

  }

  processApiXML(year,key) {

    var params = "year="+year+"&key="+key;

    var http = new XMLHttpRequest();

    http.open("POST", "https://dev2.codosome.com/wp-json/bloginator/v1/json/", false);
    
    http.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    http.setRequestHeader("Content-length", params.length);
    http.setRequestHeader("Connection", "close");
    http.send(params);

    var postData = JSON.parse(http.responseText);
    var posts = [];
    if(postData.post_details){
      postData.post_details.forEach((data, i) => {  
        var participants_array = [];
        if(data.participants !== ""){
          if(data.participants.includes("\n")){
            var participant_array =  data.participants.split("\n");
            participant_array.forEach(element => {
              participants_array.push(element);
            });
          }else{
            participants_array.push(data.participants);
          }
        }
        var locations_array = [];
        if(data.locations !== ""){
          if(data.locations.includes("\n")){
            var location_array =  data.locations.split("\n");
            location_array.forEach(element => {
              locations_array.push(element);
            });
          }else{
            locations_array.push(data.locations);
          }
        }
        posts[i] = [];
        posts[i]["blog_name"] = data.title;
        posts[i]["categories"] = '';
        posts[i]["start_date"] = data.start_date;
        posts[i]["end_date"] = data.end_date;
        posts[i]["id"] = data.id;
        posts[i]["participants"] = participants_array; 
        posts[i]["location"] = locations_array; 
        posts[i]["body"] = data.body; 
      });
    }

    if(postData.post_details && postData.post_details.length > 0) {
        var apiJsonData = {
          "blogs": posts,
          "image_max": {
            "height": postData.post_details[0].max_photo_height,
            "width": postData.post_details[0].max_photo_width
          },
          "locations": [],
          "remote": {
            "address": postData.address,
            "checkInterval": postData.checkInterval,
            "key": postData.key,
            "wysiwyg": postData.wysiwyg
          }
        };
        localforage.setItem('config', apiJsonData).then(() => this.loadConfig());
        return posts;
    } else if(postData.key) {
      return null
    } else {
      return "invalid api key"
    }
  }

  getAsync(key, dflt = null) {
    return this.ready.then(() => this.get(key, dflt));
  }

  get(key, dflt = null) {
    let o = this.config;
    const a = key.split('.');
    for (let i = 0; i < a.length; ++i) {
      const k = a[i];
      if (k in o ) {
        o = o[k];
      } else {
        return dflt;
      }
    }
    return o;
  }
}

// eslint-disable-next-line
export default (new Config);
