import { LightningElement, wire, api, track } from 'lwc';
import { getObjectInfo, getPicklistValues } from 'lightning/uiObjectInfoApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { createRecord, updateRecord } from 'lightning/uiRecordApi';

import getShifts from '@salesforce/apex/agGetShifts.getUsers';
import getServiceDomains from '@salesforce/apex/listOfIdsTestAG.getDomains';

import STAGE from '@salesforce/schema/sirenum__Shift__c.sirenum__Shift_Status__c';
import JOB_OBJECT from '@salesforce/schema/sirenum__Shift__c';
import SHIFT_OBJECT from '@salesforce/schema/sirenum__Shift__c';
import ID_FIELD from '@salesforce/schema/sirenum__LogicServiceRequest__c.Id';
import STATUS_FIELD from '@salesforce/schema/sirenum__LogicServiceRequest__c.sirenum__Status__c';

export default class AppsContainer extends LightningElement {
    @api recordId;
    @api shifts;
    @api NumberOfRecords = 5;
    @api applications;
    @api selectedItem;
    @api options;

    @track recordTypeId = '0125g000000MzwFAAS';
    @track selectedValue = '';
    @track selectedStage = '';
    @track selectedSiteValue = '';
    @track selectedJobRoleValue = '';
    @track applied = false;
    @track finished = false;
    @track uniqArray = [];
    @track siteOptions = [];
    @track jobRoleOptions = [];
    @track loading = false;
    @track loadingMessage = '';
    @track updatedDomains = [];
    @track domainsReady = false;

    @track shortlistedCands = ['0035g00000Tk3kPAAR', '0035g00000Tk3kRAAR', '0035g00000Tk3kKAAR', '0035g00000KwDLfAAN'];


    @wire(getShifts, { recordId: '$recordId', NoOfRecords: '$NumberOfRecords' })
    recordObjectData({data, error}) {
        if(data){
            console.log(`data retured from apex class: `, data);
            this.shifts = data;
            this.createSiteList(this.shifts);
            this.createJobRoleList(this.shifts);
        } else if(error) {
            window.console.log('Error ===> '+ JSON.stringify(error));
        }
    }

    // @wire(getPicklistValues, { recordTypeId: '0125g000000MzwFAAS', fieldApiName: STAGE })
    // returnedStageData({data1, error}) {
    //     if(data1) {
    //         console.log(`Data returned from getPicklistValues: `, data1)
    //         this.stageValues = data1;
    //     } else if(error) {
    //         window.console.log('Error ===> '+JSON.stringify(error));
    //     }
    // }

    @wire(getObjectInfo, { objectApiName: JOB_OBJECT })
    accObjectInfo({data, error}) {
        if(data) {
            console.log(`Value of data2 ==> `, data);
            let optionsValues = [];
            // map of record type Info
            const rtInfos = data.recordTypeInfos;

            // getting map values
            let rtValues = Object.values(rtInfos);

            for(let i = 0; i < rtValues.length; i++) {
                if(rtValues[i].name !== 'Master') {
                    optionsValues.push({
                        label: rtValues[i].name,
                        value: rtValues[i].recordTypeId
                    })
                }
            }

            this.options = optionsValues;
            console.log(`Options Values ==> `, this.options);
        }
        else if(error) {
            window.console.log('Error ===> '+ JSON.stringify(error));
        }
    }

    handleTileClick(evt) {
        console.log(`This is the evt: `, JSON.stringify(evt.detail));
        this.applied = true;
        this.finished = false;
        this.loading = true;
        this.loadingMessage = `Fetching workers....`
        this.selectedItem =  JSON.parse(JSON.stringify(evt.detail));
        if(evt.detail.Id) {
            this.app_ID = evt.detail.Id;
                const recordInput = {
                    "apiName": "sirenum__LogicServiceRequest__c",
                    "fields": {
                    "sirenum__Type__c": "Shortlist",
                    "sirenum__Status__c": "Pending",
                    "sirenum__MaxDistanceOverride__c": 12000,
                    "sirenum__Demand__c": this.app_ID
                    }
                }

                createRecord(recordInput).then(res => {
                    console.log('Logic Service Requested Created: ', res);
                    this.lsrRecordId = res.id;

                    const brecordsinputs = this.shortlistedCands.map( x => {
                        let recordInput = {
                            "apiName": "sirenum__LogicServiceDomain__c",
                            "fields": {
                                "sirenum__Percentage__c": 0.2,
                                "RecordTypeId": '0125g000000N1ySAAS',
                                "sirenum__Request__c": res.id,
                                "sirenum__Record__c": x
                            }
                        }
                        return recordInput;
                    });
                    console.log(`Array of recordInputs ==> `, brecordsinputs);
                    const _Promises = brecordsinputs.map( y => createRecord(y));
                    Promise.all(_Promises).then( (results) => {
                        console.log(`Results ==> `, results);
                        if(results) {
                            const fields = {};
                            fields[ID_FIELD.fieldApiName] = this.lsrRecordId;
                            fields[STATUS_FIELD.fieldApiName] = "Ready";
                            const recordInput = { fields };

                            updateRecord(recordInput).then(res2 => {
                                console.log(`Res2 ==> `, res2);
                                this.loadingMessage = `Workers found, scoring and ranking being performed...`
                                // while (!this.domainsReady) {
                                //     getServiceDomains({ recordId: this.lsrRecordId }).then( res3 => {
                                //         console.log(`Value of res3 ==> `, res3);
                                //         if(res3[0].sirenum__Score__c != null) {
                                //             this.updatedDomains = res3;
                                //             this.loading = false;
                                //             this.domainsReady = true;
                                //         }
                                //     })
                                // }
                                setTimeout( () => {
                                    getServiceDomains({ recordId: this.lsrRecordId }).then( res3 => {
                                        console.log(`Value of res3 ==> `, res3);
                                        if(!res3[0].sirenum__Score__c) {
                                            setTimeout( () =>{
                                                getServiceDomains({ recordId: this.lsrRecordId }).then( res4 => {
                                                    console.log(`Value of res4 ==> `, res4);
                                                    this.updatedDomains = res4;
                                                    console.log(`Value of updateDomains ==> `, this.updatedDomains);
                                                    this.loading = false;
                                                })
                                            }, 5000)
                                        } else {
                                            this.updatedDomains = res3;
                                            this.loading = false;
                                        }
                                    })
                                }, 12000)
                            })
                            .catch(error => {
                                this.loading = false;
                                this.loadingMessage = `The search was unable to be completed successfully, hit the find workers button to try again.`
                                this.dispatchEvent(
                                    new ShowToastEvent({
                                        title: 'Error creating record',
                                        message: error.body.message,
                                        variant: 'error'
                                    })
                                );
                            });
                        }
                    })
                    .catch(error => {
                        this.dispatchEvent(
                            new ShowToastEvent({
                                title: 'Error while updating records',
                                message: error.body.message,
                                variant: 'error'
                            })
                        );
                    });
                }).catch(error =>{ 
                    console.log('Error are creating Logic Service Request', error.body.message);
                    this.loading = false;
                });
        }
        console.log(`Logging the app_Id ==> `, this.app_ID);
    }

    handleChange(event) {
        this.selectedValue = event.detail.value;
    }

    handleSiteChange(event) {
        this.selectedFunctionValue = event.detail.value;
    }

    handleJobRoleChange(event) {
        this.selectedLocationValue = event.detail.value;
    }

    handleStageChange(event) {
        this.selectedStage = event.detail.value;
    }

    closeModal() {
        // to close modal set isModalOpen tarck value as false
        this.isModalOpen = false;
        this.applied = false;
        this.finished = false;
    }

    // Change Handlers.
    nameChangedHandler(event){
        this.strName = event.target.value;
    }
    numberChangedHandler(event){
        this.strAccountNumber = event.target.value;
    }
    phoneChangedHandler(event){
        this.strPhone = event.target.value;
    }

    appliedToJob(event) {
        this.finished = true;
    }

    createSiteList(array) {
        let newArray = array.map(x => {
            return x.sirenum__Site__r.Name
        });
        if(newArray) {
            this.uniqArray = [...new Set(newArray)];
            let _siteOptions = [];
            for(let i = 0; i < this.uniqArray.length; i++) {
                _siteOptions.push({
                    label: this.uniqArray[i],
                    value: this.uniqArray[i]
                });
            }
            this.siteOptions = _siteOptions;
            console.log(`Site Options ==> `, JSON.stringify(this.siteOptions));
        }
    }

    createJobRoleList(array) {
        let newArray = array.map(x => {
            return x.sirenum__Team__r.Name;
        });
        if(newArray) {
            let uniqArray = [...new Set(newArray)];
            let _jobRoleOptions = [];
            for(let i = 0; i < uniqArray.length; i++) {
                _jobRoleOptions.push({
                    label: uniqArray[i],
                    value: uniqArray[i]
                });
            }
            this.jobRoleOptions = _jobRoleOptions;
            console.log(`Job Role Options ==> `, JSON.stringify(this.jobRoleOptions));
        }
    }
}