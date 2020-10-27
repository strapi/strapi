<template><span><font-awesome-icon :icon="theIcon" :pulse="pulse" :border="border" :spin="spin" :pull="pull" :flip="flip" :rotation="rotation" :size="size" :style="attachStyles()"></font-awesome-icon></span></template>
<script>import { library } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { faKiwiBird } from "@fortawesome/free-solid-svg-icons";
library.add(faKiwiBird);
export default {
   name: "FaKiwiBird",
   components: {FontAwesomeIcon},
   props:{
       size: {type: String,required: false,default: null},
       color: { type: String, required: false, default: null},
       rotation: { type: [String, Number], required: false, default: null},
       flip: { type: String, required: false, default: null},
       pull: { type: String, required: false, default: null},
       spin: { type: Boolean, required: false, default: false},
       pulse: { type: Boolean, required: false, default: false},
       border: { type: Boolean, required: false, default: false},
   },
   computed:{ theIcon(){return faKiwiBird}},
   methods: {attachStyles: function(){return this.color ? {color: this.color} : {}}}
}
</script>