import { LightningElement, wire, track, api } from 'lwc';
//Apex Imports
import getContactData from '@salesforce/apex/getContactfieldsParam.getContacts';
import getFieldSet from '@salesforce/apex/getFieldSetMemberTestAG.getSchema';
//Schema Imports
import STATUS_FIELD from '@salesforce/schema/Contact.TR1__Candidate_Status__c';

export default class AppCandidateCard extends LightningElement {
    @api domain;
    @api candData;
    @api _fieldSetFields = [];

    FIELDS = []

    async connectedCallback() {
        let _candData = [];
        console.log(`Logging the sirenum record Id ==> `, this.domain.sirenum__Record__c);
        this._fieldSetFields = await getFieldSet();
        console.log(`getFieldSet ===> `, this._fieldSetFields);
        _candData = await getContactData({ recordId: this.domain.sirenum__Record__c, fields: this._fieldSetFields });
        [this.candData] = _candData; 

        console.log(`Contact Data ===> `, this.candData);
    }

    // @wire(getContactData, { recordId: '$domain.sirenum__Record__c', fields:  STATUS_FIELD})
    // returnedCandData({data, error}) {
    //     if(data) {
    //         console.log(`appCandidateCard returnedCandData ==> `, data);
    //         this.candData = data;
    //     } else if(error) {
    //         window.console.log(`Error received ==> `, error);
    //     }
    // }

    tileClick() {
        console.log(`tileClick: `, JSON.parse(JSON.stringify(this.domain)));
        const domain = JSON.parse(JSON.stringify(this.domain));
        const event = new CustomEvent('tileclick', {
            // detail contains only primitives
            detail: domain
        });
        // Fire the event from c-tile
        this.dispatchEvent(event);
    }
}