class Sprite{
    img;
    constructor(url){
        return new Promise((res, rej)=>{
            this.img = new Image();
            this.img.src = url;
            this.img.addEventListener("load", ()=>{
                res(this);
            })
        })
    }
}
let TEXTURES_COLLECTION = [
    new Sprite("floor.png"),
    new Sprite("wall.png"),
    new Sprite("wall-2.png"),
];
let TEXTURES = {
    Floor: null,
    Walls: []
};

class Vector2{
    x; y;
    constructor (x, y) {
        this.x = x;
        this.y = y;
    }
    sub(that) {return {x: this.x - that.x, y: this.y - that.y}}

    add(that) {
        return new Vector2(this.x + that.x, this.y + that.y)
    }
    mul(that) {
        return new Vector2(this.x * that.x, this.y * that.y)
    }
    scale(that) {return new Vector2(this.x * that,  this.y * that)}
    rotate(deg){
        let c = Math.cos(deg);
        let s = Math.sin(deg);
        let x = this.x; 
        let y = this.y; 
        return new Vector2(
            x*c - y*s, x*s + y*c
        )
    }
    dist(that){return Math.sqrt(((that.y - this.y)**2) + ((that.x - this.x)**2))};
    block_index(){return new Vector2(Math.floor(this.x), Math.floor(this.y))}
}
class Player {
    position;
    dir;
    fov = Math.PI/2;
    velocity = new Vector2(0, 0);
    normal_speed = 0.02;
    constructor (position, dir){
        this.position = position;
        this.dir = dir;
    }
}

const ctx = canvas.getContext("2d");
canvas.width = 320;
canvas.height = 200;
canvas.style.imageRendering = "pixelated";
let COLS = 10;
let ROWS = 10;
let STATE = {
    keys: {
        a: false, 
        d: false,
        arrowleft: false,
        arrowright: false,
        arrowup: false,
        arrowdown: false,
    }
};

function draw_circle(p1, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p1.x, p1.y, r, 0, Math.PI*2);
    ctx.closePath();
    ctx.fill();
}

function draw_line(p1, p2, color) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y); 
    ctx.stroke();
}
function cast_ray(orig, angle){
    let pos = {...orig};
    let delta = new Vector2(Math.cos(angle), Math.sin(angle))
    let step = new Vector2();
    let side_dist = new Vector2();
    let current_block = new Vector2(Math.floor(pos.x), Math.floor(pos.y))
    let ray_length_for_unit_in_axis = new Vector2(
        Math.sqrt(1 + ((delta.y * delta.y) / (delta.x * delta.x))),
        Math.sqrt(1 + ((delta.x* delta.x) / (delta.y * delta.y)))
    )

    /* (todo): Can be replaced with this to make it optimal;
     * deltaDistX = abs(1 / rayDirX)
     * deltaDistY = abs(1 / rayDirY) */

    if(delta.x < 0){
        step.x = -1;
        side_dist.x = (pos.x - current_block.x) * ray_length_for_unit_in_axis.x;
    }
    else {
        step.x = 1;
        side_dist.x = (current_block.x + 1 - pos.x) * ray_length_for_unit_in_axis.x;
    }
    if(delta.y < 0){
        step.y = -1;
        side_dist.y = (pos.y - current_block.y) * ray_length_for_unit_in_axis.y;
    }
    else {
        step.y = 1;
        side_dist.y = (current_block.y + 1 - pos.y) * ray_length_for_unit_in_axis.y;
    }
    let hit = false;
    let side;
    let type = "WALL";
    let dist;
    while(!hit){
        if(side_dist.x < side_dist.y){
            current_block.x += step.x;
            dist = side_dist.x;
            side_dist.x += ray_length_for_unit_in_axis.x; 
            side = "VERTICAL";
        }
        else{
            current_block.y += step.y
            dist = side_dist.y;
            side_dist.y += ray_length_for_unit_in_axis.y;
            side = "HORIZONTAL";
        }
        if(current_block.x < 0 || current_block.y < 0 || COLS <= current_block.x || ROWS <= current_block.y) {
            type = "BOUNDARY";
            break;
        }
        hit = STATE.Scene[current_block.y][current_block.x];
    }
    return {
        hit : orig.add(delta.scale(dist)),
        block : type === "WALL" ? current_block : null,
        dist,
        side,
    }

}
addEventListener("keyup", (e) => {
    if(Object.keys(STATE.keys).includes(e.key.toLowerCase())) STATE.keys[e.key.toLowerCase()] = false;
    switch(e.key){
        case "ArrowUp":
        case "ArrowDown":
        case "ArrowLeft":
        case "ArrowRight":
            STATE.Player.velocity.x = 0;
            STATE.Player.velocity.y = 0;
            break;
    }
});
addEventListener("keydown", (e) => {
    const Player = STATE.Player;
    if(Object.keys(STATE.keys).includes(e.key.toLowerCase())) STATE.keys[e.key.toLowerCase()] = true;
});

function minimap(w, h){
    ctx.save()
    ctx.scale(w/COLS, h/ROWS);
    ctx.lineWidth = 1;

    let Player = STATE.Player;
    // for(let i = 0; i <= COLS; i++){
    //     draw_line({x: i, y: 0}, {x: i, y: ROWS}, "red");
    //     draw_line({x: 0, y: i}, {x: COLS, y: i}, "red");
    // }
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, COLS, ROWS);
    // draw_line(Player.position, Player.position.add(Player.velocity.rotate(Player.dir + Math.PI/2).scale(10)), "blue")
    let P = STATE.Player;
    // all the blocks on the minimap
    for(let row = 0; row < ROWS; ++row){
        for(let col = 0; col < COLS; ++col){
            ctx.fillStyle = "red";
            if(STATE.Scene[col][row]) ctx.fillRect(row, col, 1, 1);
        }
    }

    // the fov ends
    draw_line(P.position, {
        x: P.position.x + Math.cos(P.dir - P.fov/2)*2,
        y: P.position.y + Math.sin(P.dir - P.fov/2)*2
    }, "blue")
    draw_line(P.position, {
        x: P.position.x + Math.cos(P.dir + P.fov/2)*2,
        y: P.position.y + Math.sin(P.dir + P.fov/2)*2
    }, "blue")

    for(hit of STATE.ray_hits){
        draw_circle(hit.hit, 0.1,"blue");  
    }
    ctx.restore();
}
function render_floor(){
    let Player = STATE.Player;
    const floor = TEXTURES.Floor.img;
    const image_data = ctx.createImageData(canvas.width, canvas.height);
    const buf = image_data.data; // Uint8ClampedArray, 4 bytes per pixel
    let start = (canvas.height)/2;
    let max_vision = 1.5;
    const left_fov = new Vector2(Math.cos(Player.dir - Player.fov/2), Math.sin(Player.dir - Player.fov/2))
    const right_fov = new Vector2(Math.cos(Player.dir + Player.fov/2), Math.sin(Player.dir + Player.fov/2))

    for(let y = start; y <= canvas.height; y += 1){
        let ray_dist = ((start) / (y - start)) 
        let left_point = {
            x: Player.position.x + left_fov.x * ray_dist,
            y: Player.position.y + left_fov.y * ray_dist
        }
        let right_point = {
            x: Player.position.x + right_fov.x * ray_dist,
            y: Player.position.y + right_fov.y * ray_dist
        }
        // [left_point -> right_point] <=> [(x,y0) -> (x+w, y)];
        let brightness_coeff = max_vision/ray_dist; 
        for(let x = 0; x < canvas.width; x += 1){
            let t = x/canvas.width;
            let world_x = left_point.x + (right_point.x - left_point.x) * t;
            let world_y = left_point.y + (right_point.y - left_point.y) * t;
            let u = world_x - Math.floor(world_x);
            let v = world_y - Math.floor(world_y);
            let tx = Math.floor(u * floor.width);
            let ty = Math.floor(v * floor.height);
            const tex_pixel_index = (ty * floor.width + tx) * 4;
            const scene_pixel_index = (y * canvas.width + x) * 4;
            // r
            buf[scene_pixel_index] = STATE.floor[tex_pixel_index] * brightness_coeff;
            // g
            buf[scene_pixel_index+1] = STATE.floor[tex_pixel_index+1] * brightness_coeff;
            // b
            buf[scene_pixel_index+2] = STATE.floor[tex_pixel_index+2] * brightness_coeff;
            // a
            buf[scene_pixel_index+3] = 255;
        }
    }
    ctx.putImageData(image_data, 0, 0);
}
function render_walls(){
    for(let i = 0; i < STATE.ray_hits.length; i++){
        let hit = STATE.ray_hits[i];
        if(hit.block){
            const texture = TEXTURES.Walls[STATE.Scene[hit.block.y][hit.block.x]].img;
            let texture_x = hit.side == "HORIZONTAL" ? hit.hit.x - hit.block.x : hit.block.y + 1 - hit.hit.y;
            texture_x *= texture.width;

            const wall_height = Math.ceil((canvas.height * 0.7) / hit.dist);
            const x = i; 
            const y = canvas.height/2 - wall_height/2;
            ctx.drawImage(texture, texture_x, 0, 1, texture.height, x, y, 1, wall_height)

            if(hit.side == "HORIZONTAL"){
                ctx.fillStyle = `rgba(0, 0, 0, 0.5)`;
                ctx.fillRect(x, y, 1, wall_height);
            }

            // darken based on distance
            let max_vision = 4;
            let darkness_coeff = Math.min(hit.dist/max_vision, 0.8); 
            ctx.fillStyle = `rgba(0, 0, 0, ${darkness_coeff})`;
            ctx.fillRect(x, y, 1, wall_height);
        }
    }
}

let last_frame = 0;
function game_loop(ctime){
    let delta = (ctime - last_frame)/1000;
    ctx.fillStyle = 'rgb(20, 0, 20)';
    ctx.fillRect(0, 0, canvas.width, canvas.height/2);  

    ctx.fillStyle = 'rgb(60, 0, 60)';
    ctx.fillRect(0, canvas.height/2, canvas.width, canvas.height);

    let Player = STATE.Player;
    for([key, value] of Object.entries(STATE.keys)){
        if(key == "arrowup" && value){
            Player.velocity.y = -Player.normal_speed * 60 * delta;
        }
        if(key == "arrowdown" && value){
            Player.velocity.y = Player.normal_speed* 60 * delta;
        }
        if(key == "arrowleft" && value){
            Player.velocity.x = -Player.normal_speed* 60 * delta;
        }
        if(key == "arrowright" && value){
            Player.velocity.x = Player.normal_speed* 60 * delta;
        }
        if(key == "a" && value){
            Player.dir-= 0.06 * delta * 60;
        }
        if(key == "d" && value){
            Player.dir += 0.06 * delta * 60;
        }
    }
    let new_pos = Player.position.add(Player.velocity.rotate(Player.dir + Math.PI/2));
    let new_pos_block = new_pos.block_index();
    if(0 <= new_pos.x && 0 <= new_pos.y && new_pos_block.y < ROWS &&  new_pos_block.x < COLS && !STATE.Scene[new_pos_block.y][new_pos_block.x]){
        Player.position = new_pos;
    }

    // Ray casting
    STATE.ray_hits = [];
    for(let angle = Player.dir - Player.fov/2; angle < Player.dir + Player.fov/2; angle += Player.fov / canvas.width) {
        let res = cast_ray(Player.position, angle);
        res.dist = res.dist * Math.cos(Player.dir - angle);
        if(res){
            STATE.ray_hits.push({angle, ...res})
        }
        else {
            throw new Error("Ray casting failed for some reason.")
        }
    }

    render_floor();
    render_walls();
    minimap(50, 50)
    last_frame = ctime;
    requestAnimationFrame(game_loop)
}

async function main(){
    TEXTURES_COLLECTION = await Promise.all(TEXTURES_COLLECTION);
    TEXTURES.Walls = TEXTURES.Walls.concat(...new Array(4).fill(TEXTURES_COLLECTION[2]));
    TEXTURES.Walls = TEXTURES.Walls.concat(...new Array(5).fill(TEXTURES_COLLECTION[1]));
    TEXTURES.Floor = TEXTURES_COLLECTION[0];
    const floor = TEXTURES.Floor.img;
    const offscreen = document.createElement("canvas");
    offscreen.width = floor.width;
    offscreen.height = floor.height;
    const ctx_off = offscreen.getContext("2d");
    ctx_off.drawImage(floor, 0, 0);
    STATE.floor = ctx_off.getImageData(0, 0, floor.width, floor.height).data;
    STATE = {
        ...STATE,
        Scene: Array(ROWS).fill("").map(()=>Array(COLS).fill(0)),
        // Player: new Player(new Vector2(6, 5.5), Math.PI),
        Player: new Player(new Vector2(Math.random()*10, Math.random()*10), 1e-3),
        ray_hits: [],
    }
    STATE.Scene = [
      [4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,7,7,7,7,7,7,7,7],
      [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,0,0,0,7],
      [4,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7],
      [4,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7],
      [4,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,0,0,0,7],
      [4,0,4,0,0,0,0,5,5,5,5,5,5,5,5,5,7,7,0,7,7,7,7,7],
      [4,0,5,0,0,0,0,5,0,5,0,5,0,5,0,5,7,0,0,0,7,7,7,1],
      [4,0,6,0,0,0,0,5,0,0,0,0,0,0,0,5,7,0,0,0,0,0,0,8],
      [4,0,7,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,7,7,1],
      [4,0,8,0,0,0,0,5,0,0,0,0,0,0,0,5,7,0,0,0,0,0,0,8],
      [4,0,0,0,0,0,0,5,0,0,0,0,0,0,0,5,7,0,0,0,7,7,7,1],
      [4,0,0,0,0,0,0,5,5,5,5,0,5,5,5,5,7,7,7,7,7,7,7,1],
      [6,6,6,6,6,6,6,6,6,6,6,0,6,6,6,6,6,6,6,6,6,6,6,6],
      [8,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
      [6,6,6,6,6,6,0,6,6,6,6,0,6,6,6,6,6,6,6,6,6,6,6,6],
      [4,4,4,4,4,4,0,4,4,4,6,0,6,2,2,2,2,2,2,2,3,3,3,3],
      [4,0,0,0,0,0,0,0,0,4,6,0,6,2,0,0,0,0,0,2,0,0,0,2],
      [4,0,0,0,0,0,0,0,0,0,0,0,6,2,0,0,5,0,0,2,0,0,0,2],
      [4,0,0,0,0,0,0,0,0,4,6,0,6,2,0,0,0,0,0,2,2,0,2,2],
      [4,0,6,0,6,0,0,0,0,4,6,0,0,0,0,0,5,0,0,0,0,0,0,2],
      [4,0,0,5,0,0,0,0,0,4,6,0,6,2,0,0,0,0,0,2,2,0,2,2],
      [4,0,6,0,6,0,0,0,0,4,6,0,6,2,0,0,5,0,0,2,0,0,0,2],
      [4,0,0,0,0,0,0,0,0,4,6,0,6,2,0,0,0,0,0,2,0,0,0,2],
      [4,4,4,4,4,4,4,4,4,4,1,1,1,2,2,2,2,2,2,3,3,3,3,3]
    ];
    COLS = STATE.Scene.length;
    ROWS = STATE.Scene[0].length;
    // STATE.Scene[5][4] = "#ffaf00";
    // for(let i = 0; i < 10; ++i)[
    //     const x = Math.floor(Math.random() * 9);
    //     const y = Math.floor(Math.random() * 9);
    //     STATE.Scene[y][x] = "#ffaf00";
    // ]
    requestAnimationFrame(game_loop)
};
main();
