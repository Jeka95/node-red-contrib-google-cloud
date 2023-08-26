/**
 * Copyright 2022 Google Inc.
 * Created by Ari Victor
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * This node GCE instance operations.  We will assume that msg.payload
 * contains the the configuration required if not present in `config`.
 */

/* jshint esversion: 8 */
module.exports = function (RED) {
    "use strict";
    const compute = require("@google-cloud/compute");
    const NODE_TYPE = "google-cloud-compute-engine-instance";

    function GCEInstanceNode(config) {

        RED.nodes.createNode(this, config);
        const node = this;

        const Input = async (msg, send, done) => {

            // Handle inputs
            const account = config.account || msg.payload.account;
            const instance = config.instance || msg.payload.instance;
            const keyFilename = config.keyFilename || msg.payload.keyFilename
            const operation = config.operation || msg.payload.operation
            const projectId = config.projectId || msg.payload.projectId
            const template = config.template || msg.payload.template
            const zone = config.zone || msg.payload.zone

            let credentials;
            if (account) credentials = JSON.parse(RED.nodes.getCredentials(node).account);
            const scopes = [
                'https://www.googleapis.com/auth/cloud-platform',
                'https://www.googleapis.com/auth/compute',
            ]

            let computeClient;
            if (credentials) {
                computeClient = new compute.InstancesClient({
                    "projectId": projectId,
                    "credentials": credentials,
                    "scopes": scopes
                });
            } else if (keyFilename) {
                computeClient = new compute.InstancesClient({
                    "projectId": projectId,
                    "keyFilename": keyFilename,
                    "scopes": scopes
                });
            } else {
                computeClient = new compute.InstancesClient({
                    "projectId": projectId,
                    "scopes": scopes
                });
            }

            try {
                /* Handle Get Instance */
                switch (operation) {
                    //get instance info
                    case "get":
                        node.status({ fill: "blue", shape: "dot", text: "getting instance" });
                        const response = await computeClient.get({
                                instance: instance,
                                project: projectId,
                                zone: zone
                        });
                            
                        msg.payload = response[0] || {}
                        break;

                    //list all gce instances in specified zone
                    case "list":
                        node.status({ fill: "blue", shape: "dot", text: "listing instances" });
                        await computeClient.list({
                            project: projectId,
                            zone: zone
                        });

                        msg.payload = response[0] || [];
                        break;
                    
                    //stop a running gce instance
                    case "stop":
                        node.status({ fill: "blue", shape: "dot", text: "stopping instance" });
                        const response = await computeClient.stop({
                            instance: instance,
                            project: projectId,
                            zone: zone
                        });

                        msg.payload = response[0] || {}
                        break;

                    // start a stopped gce instance
                    case "start":
                        node.status({ fill: "blue", shape: "dot", text: "starting instance" });
                        const response = await computeClient.start({
                            instance: instance,
                            project: projectId,
                            zone: zone
                        });
                        
                        msg.payload = response[0] || {}
                        break;

                    // reset existing gce instance
                    case "reset":
                        node.status({ fill: "blue", shape: "dot", text: "resetting instance" });
                        const response = await computeClient.reset({
                            instance: instance,
                            project: projectId,
                            zone: zone
                        });
                            
                        msg.payload = response[0] || {}
                        break;
                    
                    //delete existing gce instance
                    case "delete":
                        node.status({ fill: "blue", shape: "dot", text: "deleting instance" });
                        const response = await computeClient.delete({
                            instance: instance,
                            project: projectId,
                            zone: zone
                        })
                            
                        msg.payload = response[0] || {}
                        break;
                    
                    //create new gce instance of instance template using json in specified zone.
                    case "create":
                        node.status({ fill: "blue", shape: "dot", text: "creating instance" });
                        const response = await computeClient.insert({
                            project: projectId,
                            zone: zone,
                            instanceResource: typeof template === "string" ? JSON.parse(template) : template
                        });

                        msg.payload = response[0] || {}
                        break;
                }

                node.status({ fill: "green", shape: "dot", text: "complete" });
                node.send(msg);
            }
            catch (error) {
                node.status({ fill: "red", shape: "dot", text: "error" });
                if (done) {
                    done(error);
                } else {
                    node.err(error, msg);
                }
            }
        }

        const Close = () => { };

        node.on("input", Input);
        node.on("close", Close);
    }
    RED.nodes.registerType(NODE_TYPE, GCEInstanceNode);
}