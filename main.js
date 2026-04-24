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

let TEXTURES_COLLECTION = {
    floor: [
        new Sprite("sprites/floor.png"),
    ],
    wall: [
        new Sprite("sprites/wall.png"),
        new Sprite("sprites/wall-2.png"),
    ],
    "shotgun-idle": [
        new Sprite("sprites/shotgun-idle.png"),
    ],
    "shotgun-fire": new Array(10).fill("").map((_, k)=> {
         return (new Sprite("sprites/SG-Fire/" + (k).toString() + ".png"));
    }),
    "shotgun-reload": new Array(61).fill("").map((_, k)=> {
         return (new Sprite("sprites/SG-Reload/" + (k).toString().padStart(4, '0') + ".png"));
    }),

    "ar-idle": [
        new Sprite("sprites/ar-idle.png"),
    ],
    "ar-fire": new Array(7).fill("").map((_, k)=> {
         return (new Sprite("sprites/AR-Fire/" + (k).toString() + ".png"));
    }),
    "ar-reload": new Array(61).fill("").map((_, k)=> {
         return (new Sprite("sprites/AR-Reload/" + (k).toString().padStart(4, '0') + ".png"));
    })
};
const WEAPONS = [{name: "Shotgun", fire_time: 0.3, reload_time: 0.9, recoil: 0.02}, {name: "AR", fire_time: 0, reload_time: 0.9, recoil: 0.01}];
let TEXTURES = {
    Floor: null,
    Walls: [],
    Weapons: Object(),
};

for(wp of WEAPONS){
    TEXTURES.Weapons[wp.name] = {
        Idle: [],
        Fire: [],
        Reload: []
    }
}
class Vector2{
    x; y;
    constructor (x, y) {
        this.x = x;
        this.y = y;
    }
    sub(that) {return new Vector2(this.x - that.x, this.y - that.y)}

    add(that) {
        return new Vector2(this.x + that.x, this.y + that.y)
    }
    mul(that) {
        return new Vector2(this.x * that.x, this.y * that.y)
    }
    scale(that) {return new Vector2(this.x * that,  this.y * that)}
    dist(that){return Math.sqrt(((that.y - this.y)**2) + ((that.x - this.x)**2))};
    dist_sq(that){return (((that.y - this.y)**2) + ((that.x - this.x)**2))};
    normalize(){return this.scale(1/this.dist(new Vector2(0, 0)));}
    rotate(deg){
        let c = Math.cos(deg);
        let s = Math.sin(deg);
        let x = this.x; 
        let y = this.y; 
        return new Vector2(
            x*c - y*s, x*s + y*c
        )
    }
    block_index(){return new Vector2(Math.floor(this.x), Math.floor(this.y))}
}


class Player {
    speed;
    position;
    dir;
    dir_vector;
    plane;
    fov = Math.PI/2;
    bob_time = 0;
    bob_speed = 8;
    state = "Idle";
    weapon = 0;
    sprite_index = 0;
    normal_speed = 0.02;
    turning_speed = 0.04;
    gun_arm_speed = 0.007;
    last_sprite_time = 0;
    constructor (position, dir){
        this.position = position;
        this.dir = dir;
        this.plane = new Vector2(0, Math.tan(this.fov/2));
        this.speed = this.normal_speed;
    }
}

const ctx = canvas.getContext("2d");
canvas.width = 320;
canvas.height = 200;
canvas.style.imageRendering = "pixelated";
let COLS;
let ROWS;
let STATE = {
    Enemy: [
        new Vector2(10.5, 2.5)
    ],
    highlight: {},
    keys: {
        keya: false, 
        keyw: false, 
        keys: false, 
        keyd: false,
        keyr: false,
        keyq: false,
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
function cast_ray(w_px, dx){
    const Player = STATE.Player;
    let pos = {...Player.position};
    if(dx == undefined) dx = w_px/(canvas.width/2) - 1;
    let delta = Player.dir_vector.add(Player.plane.scale(dx)); 
    let step = new Vector2();
    let side_dist = new Vector2();
    let current_block = new Vector2(Math.floor(pos.x), Math.floor(pos.y))
    let ray_length_for_unit_in_axis = new Vector2(
        Math.sqrt(1 + ((delta.y * delta.y) / (delta.x * delta.x))),
        Math.sqrt(1 + ((delta.x* delta.x) / (delta.y * delta.y)))
    )
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
    let perp_dist;
    if (side === "VERTICAL") {
        perp_dist = (current_block.x - pos.x + (1 - step.x) / 2) / delta.x;
    } else {
        perp_dist = (current_block.y - pos.y + (1 - step.y) / 2) / delta.y;
    }
    let hit_pos = {};
    if (side === "VERTICAL") {
        hit_pos.y = pos.y + perp_dist * delta.y;
        hit_pos.x = current_block.x;
    } else {
        hit_pos.x = pos.x + perp_dist * delta.x;
        hit_pos.y = current_block.y;
    }
    return {
        hit_text_cords: hit_pos,
        dist,
        perp_dist,
        side,
        block : type === "WALL" ? current_block : null,
        hit_cords: Player.position.add(delta.normalize().scale(dist)),
    }

}
addEventListener("keyup", (e) => {
    if(Object.keys(STATE.keys).includes(e.code.toLowerCase())) STATE.keys[e.code.toLowerCase()] = false;
});

addEventListener("keydown", (e) => {
    if(Object.keys(STATE.keys).includes(e.code.toLowerCase())) STATE.keys[e.code.toLowerCase()] = true;
});

canvas.addEventListener("click", () => canvas.requestPointerLock());
addEventListener("mousemove", e => {
    if(document.pointerLockElement === canvas){
        let Player = STATE.Player;
        Player.turn = e.movementX * -0.001;
    }
});

addEventListener("mousedown", e => {
    if(document.pointerLockElement === canvas){
        let Player = STATE.Player;
        Player.fire = true;
    }
});
addEventListener("mouseup", e => {
    if(document.pointerLockElement === canvas){
        let Player = STATE.Player;
        Player.fire = false;
    }
});
function minimap(w, h){
    ctx.save()
    ctx.scale(w/COLS, h/ROWS);
    ctx.lineWidth = 0.5;

    let Player = STATE.Player;
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, COLS, ROWS);
    let P = STATE.Player;
    // all the blocks on the minimap
    for(let row = 0; row < ROWS; ++row){
        for(let col = 0; col < COLS; ++col){
            ctx.fillStyle = "red";
            if(STATE.Scene[col][row]) ctx.fillRect(row, col, 1, 1);
        }
    }

    // the fov 
    draw_circle(P.position, 0.2, "red")
    draw_circle(P.position.add(P.dir_vector), 0.2, "red")
    draw_circle(P.position.add(P.dir_vector.add(P.plane)), 0.2, "cyan")
    draw_circle(P.position.add(P.dir_vector.add(P.plane.scale(-1))), 0.2, "cyan")
    for(hit of STATE.ray_hits){
        draw_circle(hit.hit_cords, 0.2, "cyan")
    } 
    draw_circle(P.position.add(P.dir_vector.add(P.plane)), 0.2, "cyan")
    for(let e of STATE.Enemy){
        draw_circle(e, 0.2, "cyan")
    }
    if(STATE.highlight){
        draw_line(Player.position, STATE.highlight, "blue");
        draw_circle(STATE.highlight, 0.4, "pink")
    }
    ctx.restore();
}
function render_floor(){
    let Player = STATE.Player;
    const floor = TEXTURES.Floor.img;
    const image_data = ctx.createImageData(canvas.width, canvas.height);
    const buf = image_data.data; // Uint8ClampedArray, 4 bytes per pixel
    let start = (canvas.height)/2;
    let max_vision = 1;
    const left_fov = Player.dir_vector.add(Player.plane.scale(-1)).normalize();
    const right_fov = Player.dir_vector.add(Player.plane).normalize();
    for(let y = start + 1; y <= canvas.height; y += 1){
        let ray_dist = ((start) / (y - start)) 
        let left_point = Player.position.add(left_fov.scale(ray_dist)); 
        let right_point = Player.position.add(right_fov.scale(ray_dist)); 
        let brightness_coeff = ((y - start)/start) * max_vision; 
        for(let x = 0; x < canvas.width; x += 1){
            let brightness = brightness_coeff * Math.abs(Math.abs(canvas.width/2 - x) / (canvas.width/2) - 1) ** 2
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
            buf[scene_pixel_index] = STATE.floor[tex_pixel_index] * brightness;
            // g
            buf[scene_pixel_index+1] = STATE.floor[tex_pixel_index+1] * brightness;
            // b
            buf[scene_pixel_index+2] = STATE.floor[tex_pixel_index+2] * brightness;
            // a
            buf[scene_pixel_index+3] = 255;
        }
    }
    ctx.putImageData(image_data, 0, 0);
}
function render_walls(){
    const center_hit = cast_ray(0); 
    for(let i = 0; i < canvas.width; i++){
        let hit = STATE.ray_hits[i];
        if(hit.block){
            const texture = TEXTURES.Walls[STATE.Scene[hit.block.y][hit.block.x]].img;
            let texture_x = hit.side == "HORIZONTAL" ? hit.hit_text_cords.x - hit.block.x : hit.hit_text_cords.y - hit.block.y;
            texture_x *= texture.width;
            const aspect_correction = center_hit.perp_dist / center_hit.dist;
            const wall_height = Math.ceil((canvas.height * aspect_correction) / hit.perp_dist);
            const x = i; 
            const y = canvas.height/2 - wall_height/2;
            ctx.drawImage(texture, texture_x, 0, 1, texture.height, x, y, 1, wall_height)
            if(hit.side == "HORIZONTAL"){
                ctx.fillStyle = `rgba(0, 0, 0, 0.2)`;
                ctx.fillRect(x, y, 1, wall_height);
            }

            // darken based on distance
            let max_vision = 3;
            let darkness_coeff = Math.min((hit.dist/max_vision) ** (1/2), 0.98); 
            ctx.fillStyle = `rgba(0, 0, 0, ${darkness_coeff})`;
            ctx.fillRect(x, y-1, 1, wall_height+1);
        }
    }
}

function render_weapon(ctime){
    const Player = STATE.Player;
    const Weapon_Slide = TEXTURES.Weapons[WEAPONS[Player.weapon].name][Player.state == "Switch" ? "Reload": Player.state];

    let time;
    if(Player.state == "Reload" || Player.state == "Switch"){
        time = WEAPONS[Player.weapon].reload_time;
    }
    else if(Player.state == "Fire"){
        time = WEAPONS[Player.weapon].fire_time;
    }
    const Weapon = Weapon_Slide[Player.sprite_index % Weapon_Slide.length].img; 
    let bob_x = Math.sin(Player.bob_time) * 5;
    let bob_y = Math.abs(Math.sin(Player.bob_time)) * 10; 
    const scale = 0.6;
    let applied_w = Weapon.width*scale;
    let applied_h = Weapon.height*scale;
    ctx.drawImage(
        Weapon,
        0, 0, Weapon.width, Weapon.height,
        canvas.width/2 - applied_w/2 + bob_x,
        canvas.height - applied_h + 40 + bob_y,
        applied_w,
        applied_h 
    )
    let seconds_per_frame = (time * 1000) / Weapon_Slide.length;
    if(seconds_per_frame < ctime - Player.last_sprite_time ){
        Player.sprite_index++;
        Player.last_sprite_time = ctime;
    }
    if(Player.sprite_index >= 40 && Player.state == "Switch"){
        Player.weapon = (Player.weapon+1) % WEAPONS.length; 
        Player.state = "Reload"
    }
    if(Player.sprite_index >= Weapon_Slide.length){
        Player.sprite_index = 0;
        if(Player.state === "Fire" || Player.state === "Reload"){
            Player.speed = Player.normal_speed;
            Player.state = "Idle";
        }
    }
}

function lines_intersect_2d(p0, p1, p2, p3) {
    let s10_x = p1.x - p0.x;
    let s10_y = p1.y - p0.y;
    let s32_x = p3.x - p2.x;
    let s32_y = p3.y - p2.y;

    let denom = s10_x * s32_y - s32_x * s10_y;

    if (denom == 0) return null;

    let denom_is_positive = denom > 0

    let s02_x = p0.x - p2.x;
    let s02_y = p0.y - p2.y;

    let s_numer = s10_x * s02_y - s10_y * s02_x;

    if ((s_numer < 0) == denom_is_positive) return null;

    let t_numer = s32_x * s02_y - s32_y * s02_x;

    if ((t_numer < 0) == denom_is_positive) return None;

    if ((s_numer > denom) == denom_is_positive || (t_numer > denom) == denom_is_positive) return null; 

    let t = t_numer / denom;
    let intersection_point = { x: p0.x + (t * s10_x), y: p0.y + (t * s10_y)}
    return intersection_point
}
function render_enemies(){
    const center_hit = cast_ray(0); 
    const Player = STATE.Player;
    for(let e of STATE.Enemy){
        const a = Player.dir_vector.add(Player.plane.scale(-1));
        const c = Player.dir_vector.add(Player.plane);
        const b = { y: (e.y - Player.position.y), x: (e.x - Player.position.x)};
        const cross = (a, b) => (a.y * b.x - a.x * b.y);
        STATE.highlight = null;
        if(cross(a, b) * cross(a, c) >= 0 && cross(c, b) * cross(c, a) >= 0 ){
            const intersect = lines_intersect_2d(
                Player.position, e, 
                Player.position.add(a), 
                Player.position.add(c)
            )
            if(intersect){
                const dist = Player.position.dist(e);
                const cut_plane_in_ratio = Player.position.add(a).dist(intersect);
                const pos = cast_ray(null, cut_plane_in_ratio - 1);
                if( dist <= pos.dist){
                    const sx = cut_plane_in_ratio * canvas.width/2;
                    const aspect_correction = center_hit.perp_dist / center_hit.dist;
                    const height = Math.ceil((canvas.height * aspect_correction) / dist);
                    STATE.highlight = pos.hit_cords; 
                    const y = canvas.height/2 - height/2;
                    ctx.fillStyle = "red";
                    ctx.fillRect(sx, y, 1, height)
                }
            }
        };
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
    let new_pos;

    if(["keya", "keyd", "keyw", "keys"].map((key) => STATE.keys[key]).some(Boolean)) 
        Player.bob_time += Player.bob_speed * delta;
    for([key, value] of Object.entries(STATE.keys)){
        if(Player.turn){
            Player.dir -= Player.turn * delta * 60;
            Player.plane = Player.plane.rotate(Player.turn * delta * -60);
            Player.turn = false;
        }
        Player.dir_vector = new Vector2(Math.cos(Player.dir), Math.sin(Player.dir));
        if(key == "keyw" && value){
            new_pos = Player.position.add(Player.dir_vector.scale(Player.speed * 60 * delta))
        }
        if(key == "keys" && value){
            new_pos = Player.position.sub(Player.dir_vector.scale(Player.speed * 60 * delta))
        }
        if(key == "keya" && value){
            new_pos = Player.position.add(Player.dir_vector.rotate(-Math.PI/2).scale(Player.speed * 60 * delta))
        }
        if(key == "keyd" && value){
            new_pos = Player.position.add(Player.dir_vector.rotate(Math.PI/2).scale(Player.speed * 60 * delta))
        }
        if(key == "keyr" && value){
            Player.state = "Reload"
            Player.speed = Player.gun_arm_speed;
        }
        if(key == "keyq" && value){
            Player.state = "Switch"
            Player.speed = Player.gun_arm_speed;
        }
        if(Player.fire){
            Player.state = "Fire"
            Player.speed = Player.gun_arm_speed;
            // recoil
            const recoil = WEAPONS[Player.weapon].recoil;
            let rand = Math.random()*recoil - recoil/2;
            Player.dir += rand * delta * 60;
            Player.plane = Player.plane.rotate(rand * delta * 60);
            new_pos = Player.position.sub(Player.dir_vector.scale(0.002 * 60 * delta))
        }
    }
    if(new_pos){
        let new_pos_block = new_pos.block_index();
        if(0 <= new_pos.x && 0 <= new_pos.y && new_pos_block.y < ROWS &&  new_pos_block.x < COLS && !STATE.Scene[new_pos_block.y][new_pos_block.x]){
            Player.position = new_pos;
        }
    }

    // Ray casting
    STATE.ray_hits = [];
    for(let x = 0; x < canvas.width; x++) {
        let res = cast_ray(x);
        if(res){
            STATE.ray_hits.push(res)
        }
        else {
            throw new Error("Ray casting failed for some reason.")
        }
    }
    render_floor();
    render_walls();
    render_enemies();
    render_weapon(ctime);
    minimap(50, 50)
    last_frame = ctime;
    requestAnimationFrame(game_loop)
}

async function main(){
    for([key, arr] of Object.entries(TEXTURES_COLLECTION)){
       TEXTURES_COLLECTION[key] = await Promise.all(arr); 
    }
    TEXTURES.Weapons[WEAPONS[0].name].Idle = TEXTURES_COLLECTION["shotgun-idle"];
    TEXTURES.Weapons[WEAPONS[0].name].Fire = TEXTURES_COLLECTION["shotgun-fire"];
    TEXTURES.Weapons[WEAPONS[0].name].Reload = TEXTURES_COLLECTION["shotgun-reload"];

    TEXTURES.Weapons[WEAPONS[1].name].Idle = TEXTURES_COLLECTION["ar-idle"];
    TEXTURES.Weapons[WEAPONS[1].name].Fire = TEXTURES_COLLECTION["ar-fire"];
    TEXTURES.Weapons[WEAPONS[1].name].Reload = TEXTURES_COLLECTION["ar-reload"];

    TEXTURES.Walls = TEXTURES.Walls.concat(...new Array(4).fill(TEXTURES_COLLECTION["wall"][0]));
    TEXTURES.Walls = TEXTURES.Walls.concat(...new Array(5).fill(TEXTURES_COLLECTION["wall"][1]));
    TEXTURES.Floor = TEXTURES_COLLECTION["floor"][0];

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
        Player: new Player(new Vector2(6, 5.5), 0),
        // Player: new Player(new Vector2(Math.random()*10, Math.random()*10), 1e-3),
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
