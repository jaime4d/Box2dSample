var Wheel;
(function (Wheel) {
    var Scripts;
    (function (Scripts) {
        var WheelState;
        (function (WheelState) {
            WheelState[WheelState["Idle"] = 0] = "Idle";
            WheelState[WheelState["Start"] = 1] = "Start";
            WheelState[WheelState["AccelerateStart"] = 2] = "AccelerateStart";
            WheelState[WheelState["AccelerateRunning"] = 3] = "AccelerateRunning";
            WheelState[WheelState["SpinNormalStart"] = 4] = "SpinNormalStart";
            WheelState[WheelState["SpinNormalRunning"] = 5] = "SpinNormalRunning";
            WheelState[WheelState["DeccelerateStart"] = 6] = "DeccelerateStart";
            WheelState[WheelState["DeccelerateRunning"] = 7] = "DeccelerateRunning";
            WheelState[WheelState["StopStart"] = 8] = "StopStart";
            WheelState[WheelState["StopRunning"] = 9] = "StopRunning";
        })(WheelState || (WheelState = {}));
        var WheelScript = (function () {
            function WheelScript() {
                this.TWO_PI = 2.0 * Math.PI;
                this._confVelocity = Math.PI * 1.5;
                this._confT1 = 0.5;
                this._confT2 = 2.5;
                this._confT3 = 1.0;
                this._wheelState = WheelState.Idle;
                this._isRunning = false;
                this.resetState();
            }
            WheelScript.prototype.resetState = function () {
                this._angle = 0.0;
                this._velocity = 0.0;
                this._acceleration = 0.0;
            };
            WheelScript.prototype.getAngle = function () {
                return this._angle;
            };
            WheelScript.prototype.getVelocity = function () {
                return this._velocity;
            };
            Object.defineProperty(WheelScript.prototype, "isRunning", {
                get: function () {
                    return this._isRunning;
                },
                enumerable: true,
                configurable: true
            });
            WheelScript.prototype.start = function (stopAtAngle) {
                if (this._wheelState != WheelState.Idle) {
                    console.error("Wheel is running!");
                    return;
                }
                this._isRunning = true;
                this._stopAtAngle = stopAtAngle;
                this._wheelState = WheelState.Start;
            };
            WheelScript.prototype.update = function (dt) {
                if (!this._isRunning)
                    return;
                this._d0 = (this._velocity * dt); // every step advances about 3 degrees
                this._angle = (this._angle + this._d0) % this.TWO_PI;
                this._velocity += this._acceleration * dt;
                switch (this._wheelState) {
                    case WheelState.Idle:
                        break;
                    case WheelState.Start:
                        {
                            this._wheelState = WheelState.AccelerateStart;
                            console.info("==>");
                            console.info("Starting from angle: " + this._angle + ", stopping at: " + this._stopAtAngle);
                        }
                        break;
                    case WheelState.AccelerateStart:
                        {
                            this._runningTime = 0.0;
                            this._acceleration = this._confVelocity / this._confT1;
                            this._wheelState = WheelState.AccelerateRunning;
                        }
                        break;
                    case WheelState.AccelerateRunning:
                        {
                            this._runningTime += dt;
                            if (this._velocity >= this._confVelocity) {
                                this._acceleration = 0.0;
                                this._wheelState = WheelState.SpinNormalStart;
                            }
                        }
                        break;
                    case WheelState.SpinNormalStart:
                        {
                            this._runningTime = 0.0;
                            this._wheelState = WheelState.SpinNormalRunning;
                        }
                        break;
                    case WheelState.SpinNormalRunning:
                        {
                            this._runningTime += dt;
                            if (this._runningTime >= this._confT2) {
                                this._d0Step = this._d0;
                                console.log("preparing to deccelerate, step angle: " + this._d0Step * (180.0 / Math.PI));
                                this._acceleration = 0.0;
                                this._wheelState = WheelState.DeccelerateStart;
                            }
                        }
                        break;
                    case WheelState.DeccelerateStart:
                        {
                            this._runningTime = 0.0;
                            this._displacement = 0.0;
                            var d0 = (this._stopAtAngle - this._angle);
                            if (d0 < 0)
                                d0 = this.TWO_PI + d0;
                            this._displacementToStop = d0 + this.TWO_PI;
                            console.info("displacement to stop: " + this._displacementToStop);
                            this._acceleration = -(this._velocity * this._velocity) / (2.0 * this._displacementToStop);
                            this._wheelState = WheelState.DeccelerateRunning;
                        }
                        break;
                    case WheelState.DeccelerateRunning:
                        {
                            this._runningTime += dt;
                            this._displacement += (this._d0);
                            if (this._displacement + this._d0Step >= this._displacementToStop) {
                                // + this._d0Step because we want to be below target angle, not over.
                                // this way, we can just translate to the correct angle without changing
                                // spin direction. Doing so would cause a visual artifact.
                                this._acceleration = 0.0;
                                this._velocity = 0.0;
                                this._wheelState = WheelState.StopStart;
                            }
                        }
                        break;
                    case WheelState.StopStart:
                        {
                            var delta0 = (this._stopAtAngle - this._angle) * (180.0 / Math.PI);
                            console.info("*Stopped at rad: " + this._stopAtAngle + ", actual rad: " + this._angle + " delta deg: " + delta0 + " stopping time: " + this._runningTime);
                            this._runningTime = 0.0;
                            this._wheelState = WheelState.StopRunning;
                        }
                        break;
                    case WheelState.StopRunning:
                        {
                            this._isRunning = false;
                            this._runningTime += dt;
                            this._wheelState = WheelState.Idle;
                            var delta0 = (this._stopAtAngle - this._angle) * (180.0 / Math.PI);
                            if (Math.abs(delta0) > 2.0) {
                                console.info("Sim landed " + ((delta0 < 0) ? "past" : "below") + " target");
                            }
                            else {
                                console.info("Sim landed within threshold");
                            }
                            // we can just translate now if we have any remaining d0
                            this._angle = this._stopAtAngle;
                        }
                        break;
                }
            };
            return WheelScript;
        }());
        Scripts.WheelScript = WheelScript;
    })(Scripts = Wheel.Scripts || (Wheel.Scripts = {}));
})(Wheel || (Wheel = {}));
/// <reference path="scripts/typings/box2d/index.d.ts" />
/// <reference path="wheelScript.ts" />
var b2Vec2 = Box2D.Common.Math.b2Vec2;
var b2BodyDef = Box2D.Dynamics.b2BodyDef;
var b2Body = Box2D.Dynamics.b2Body;
var b2FixtureDef = Box2D.Dynamics.b2FixtureDef;
var b2Fixture = Box2D.Dynamics.b2Fixture;
var b2World = Box2D.Dynamics.b2World;
var b2MassData = Box2D.Collision.Shapes.b2MassData;
var b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape;
var b2CircleShape = Box2D.Collision.Shapes.b2CircleShape;
var b2DebugDraw = Box2D.Dynamics.b2DebugDraw;
var b2RevoluteJointDef = Box2D.Dynamics.Joints.b2RevoluteJointDef;
var b2RevoluteJoint = Box2D.Dynamics.Joints.b2RevoluteJoint;
var b2DistanceJointDef = Box2D.Dynamics.Joints.b2DistanceJointDef;
var b2DistanceJoint = Box2D.Dynamics.Joints.b2DistanceJoint;
var GameApp = (function () {
    function GameApp(canvas) {
        this._world = new Box2D.Dynamics.b2World(new Box2D.Common.Math.b2Vec2(0, 10), true);
        this._wheel = new Wheel.Scripts.WheelScript();
        var debugDraw = new Box2D.Dynamics.b2DebugDraw();
        debugDraw.SetSprite(canvas.getContext("2d"));
        debugDraw.SetDrawScale(1.0);
        debugDraw.SetFillAlpha(0.3);
        debugDraw.SetLineThickness(1.0);
        debugDraw.SetFlags(Box2D.Dynamics.b2DebugDraw.e_shapeBit | Box2D.Dynamics.b2DebugDraw.e_jointBit);
        this._world.SetDebugDraw(debugDraw);
    }
    GameApp.prototype.start = function () {
        //create ground
        var fixDef = new b2FixtureDef();
        fixDef.density = 1.0;
        fixDef.friction = 0.5;
        fixDef.restitution = 0.2;
        var bodyDef = new b2BodyDef();
        bodyDef.type = b2Body.b2_staticBody;
        bodyDef.position.x = 10;
        bodyDef.position.y = 350;
        var sh = new b2PolygonShape();
        sh.SetAsBox(1000, 5);
        fixDef.shape = sh;
        this._world.CreateBody(bodyDef).CreateFixture(fixDef);
        //create some objects
        bodyDef.type = b2Body.b2_dynamicBody;
        for (var i = 0; i < 10; ++i) {
            if (Math.random() > 0.5) {
                sh = new b2PolygonShape();
                sh.SetAsBox(Math.random() + 10 //half width
                , Math.random() + 10 //half height
                );
                fixDef.shape = sh;
            }
            else {
                fixDef.shape = new b2CircleShape(Math.random() + 10 //radius
                );
            }
            bodyDef.position.x = Math.random() * 500;
            bodyDef.position.y = 0;
            this._world.CreateBody(bodyDef).CreateFixture(fixDef);
        }
        // == body with multiple fixtures ==
        // base, used for anchoring
        var bodyDef = new b2BodyDef();
        bodyDef.type = b2Body.b2_staticBody;
        bodyDef.position.x = 350;
        bodyDef.position.y = 200;
        sh = new b2PolygonShape();
        sh.SetAsBox(10, 10);
        fixDef.shape = sh;
        var wheelBaseBody = this._world.CreateBody(bodyDef);
        wheelBaseBody.CreateFixture(fixDef);
        // outer wheel shape
        bodyDef = new b2BodyDef;
        bodyDef.type = b2Body.b2_kinematicBody;
        bodyDef.position.x = 350;
        bodyDef.position.y = 200;
        this._wheelBody = this._world.CreateBody(bodyDef);
        var wheelRadius = 100;
        fixDef = new b2FixtureDef;
        fixDef.shape = new b2CircleShape(wheelRadius);
        this._wheelBody.CreateFixture(fixDef);
        // revolute joint for wheel and base (optional)
        // not really needed if wheel body is kynematic
        var jdef = new b2RevoluteJointDef();
        jdef.bodyA = this._wheelBody;
        jdef.bodyB = wheelBaseBody;
        this._world.CreateJoint(jdef);
        // wheel pegs
        var numSegments = 16;
        var fixturePeg;
        var radius = 5;
        var d0 = Math.PI * 2 / numSegments;
        for (var i_1 = 0; i_1 < numSegments; i_1++) {
            fixturePeg = new b2CircleShape(radius);
            var theta = d0 * i_1;
            var pos = new b2Vec2();
            pos.x = wheelRadius * Math.cos(theta);
            pos.y = wheelRadius * Math.sin(theta);
            fixturePeg.SetLocalPosition(pos);
            this._wheelBody.CreateFixture2(fixturePeg);
        }
        // ==wheel rudder==
        bodyDef = new b2BodyDef();
        bodyDef.type = b2Body.b2_dynamicBody;
        fixDef.density = 1.0;
        fixDef.friction = 0.5;
        fixDef.restitution = 0.2;
        bodyDef.position.x = 350;
        bodyDef.position.y = 200 - 100 - 13;
        sh = new b2PolygonShape();
        sh.SetAsBox(2, 10);
        fixDef.shape = sh;
        var wheelRudder = this._world.CreateBody(bodyDef);
        wheelRudder.CreateFixture(fixDef);
        // attaching rudder with wheel base with revolute joint
        // this causes the rudder to rotate if the base is rotated.
        jdef = new b2RevoluteJointDef();
        var pivot = new b2Vec2(wheelRudder.GetWorldCenter().x, wheelRudder.GetWorldCenter().y - 4);
        jdef.Initialize(wheelRudder, wheelBaseBody, pivot);
        this._world.CreateJoint(jdef);
        // left spring-like joint
        var ddef = new b2DistanceJointDef();
        ddef.frequencyHz = 20;
        ddef.dampingRatio = 0.2;
        var pivotA = new b2Vec2(wheelRudder.GetWorldCenter().x - 2, wheelRudder.GetWorldCenter().y - 4);
        var pivotB = new b2Vec2(wheelRudder.GetWorldCenter().x - 15, wheelRudder.GetWorldCenter().y);
        ddef.Initialize(wheelRudder, wheelBaseBody, pivotA, pivotB);
        this._world.CreateJoint(ddef);
        // right spring-linke joint
        ddef = new b2DistanceJointDef();
        ddef.frequencyHz = 20;
        ddef.dampingRatio = 0.2;
        pivotA = new b2Vec2(wheelRudder.GetWorldCenter().x + 2, wheelRudder.GetWorldCenter().y - 4);
        pivotB = new b2Vec2(wheelRudder.GetWorldCenter().x + 15, wheelRudder.GetWorldCenter().y);
        ddef.Initialize(wheelRudder, wheelBaseBody, pivotA, pivotB);
        this._world.CreateJoint(ddef);
        // rotate the whole wheel body a bit
        wheelBaseBody.SetAngle(Math.PI / 4);
    };
    GameApp.prototype.update = function (dt) {
        // do simulation
        this._wheel.update(dt);
        this._wheelBody.SetAngle(this._wheel.getAngle());
        // step world
        this._world.Step(dt //frame-rate
        , 2 //velocity iterations
        , 2 //position iterations
        );
        this._world.DrawDebugData();
        this._world.ClearForces();
    };
    GameApp.prototype.onClick = function (e) {
        /*
        if (this._wheelBody.GetAngularVelocity() > 0) {
            this._wheelBody.SetAngularVelocity(0);
        } else {
            this._wheelBody.SetAngularVelocity(1.5);
        }
        
        this._wheelBody.SetAwake(true);
        */
        this._wheel.start(Math.random() * Math.PI * 2.0);
        this._wheelBody.SetAwake(true);
    };
    return GameApp;
}());
var g_app;
window.onload = function () {
    var canvas = document.getElementById('canvas');
    g_app = new GameApp(canvas);
    g_app.start();
    canvas.addEventListener("click", onClick, false);
    window.setInterval(update, 1000.0 / 60.0);
};
function update() {
    g_app.update(1.0 / 60.0);
}
;
function onClick(e) {
    g_app.onClick(e);
}
//# sourceMappingURL=Box2dSample.js.map