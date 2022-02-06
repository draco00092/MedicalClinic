import { LightningElement, track } from 'lwc';
import getAppointments from '@salesforce/apex/medicalClinicComponentCtrl.getAppointments';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getSpecificationNames from '@salesforce/apex/medicalClinicComponentCtrl.getSpecificationNames';
import getAvailablePhysicians from '@salesforce/apex/medicalClinicComponentCtrl.getAvailablePhysicians';
import insertPatientRecord from '@salesforce/apex/medicalClinicComponentCtrl.insertPatientRecord';

const COLS = [
    { label: 'Physician', fieldName: 'Name' },
    { label: 'Email', fieldName: 'Email__c', type: 'email' },
    {
        type: "button",
        fixedWidth: 150,
        typeAttributes: {
            label: 'Booking',
            title: 'Booking',
            name: 'booking',
            value: 'booking',
            variant: 'brand',
            class: 'scaled-down'
        }
    }
];

export default class MedicalClinicComponent extends LightningElement {
    date;
    specializationOptions = [];
    appointmentData = [];
    isappointmentDataAvailable = false;
    appointmentDataMessage = 'No Physician available for this time';
    appointmentColumns = COLS;
    rowOffset = 0;
    specializationValue = '';
    physiciansWithSpecializatioMap = new Map();
    selectedPhysiciansWithSpecialization = [];
    physiciansValue = '';
    timePicker = false;
    specializationAppointmentFee = new Map();
    currentAppointmentFee;
    curentDate;
    isModalOpen = false;
    appointedPhysicianDetails;
    patientRecordMap = new Map();
    patientName;
    patientEmail;
    patientAddress;
    patiendMobile;


    connectedCallback(){
        var today = new Date();
        this.date=today.toISOString();
        this.curentDate = today.toISOString();
        console.log(today.toISOString());
        getSpecificationNames()
        .then(result => {
            for (var i = 0; i < result.length; i++) {
                this.specializationOptions = [ ...this.specializationOptions, ({value: result[i].Id, label: result[i].Name})];
                this.physiciansWithSpecializatioMap.set( result[i].Id, result[i].Physicians__r );
                this.specializationAppointmentFee.set( result[i].Id, result[i].Appointment_fee__c );
                console.log('Result ' ,result[i]);
                if( i == 0 ){
                    this.specializationValue = result[i].Id;
                    this.currentAppointmentFee = result[i].Appointment_fee__c;
                    let physicians = result[i].Physicians__r;
                    if( physicians != undefined && physicians != null && physicians != 'undefined' ){
                        this.assignPhysicianData( physicians );
                    }
                }
            }
            console.log( 'this.physiciansWithSpecializatioMap : ', this.physiciansWithSpecializatioMap );
            this.getPhysiciansDetails( this.date, this.specializationValue );
        })
        .catch(error => {
            this.showInfoToast( 'Error', JSON.stringify(error) , 'error' );
        });
    }

    assignPhysicianData( physicians ){
        this.selectedPhysiciansWithSpecialization = [];
        if( physicians != undefined && physicians != null && physicians != 'undefined' ){
            for (var j = 0; j < physicians.length; j++) {
                console.log( 'physicians : ', physicians[j].Name );
                this.selectedPhysiciansWithSpecialization = [ ...this.selectedPhysiciansWithSpecialization, ({value: physicians[j].Id, label: physicians[j].Name}) ];
                if( j == 0 ){
                    this.physiciansValue = physicians[j].Id;
                }
                this.timePicker = true;
            }
        }
    }

    dateAction( event ){
        this.date = event.target.value;
        this.getPhysiciansDetails( this.date, this.specializationValue );
        
    }

    getPhysiciansDetails( date, specializationValue ){
        this.isappointmentDataAvailable = false;
        getAvailablePhysicians({appointmentTime : date, specializationId : specializationValue})
        .then(result => {
            if( result != undefined && result.length > 0 ){
                this.appointmentData = result;
                console.log( 'this.appointmentData : ', this.appointmentData );
                this.isappointmentDataAvailable = true;
            }
        })
        .catch(error => {
            this.showInfoToast( 'Error', JSON.stringify(error), 'error' );
        });
    }

    handleSpecializationChange(event) {
        console.log('handleSpecializationChange : ',event.detail.value);
        this.specializationValue = event.target.value;
        var physicians = this.physiciansWithSpecializatioMap.get( event.detail.value );
        this.currentAppointmentFee = this.specializationAppointmentFee.get( event.detail.value );
        this.getPhysiciansDetails( this.date, this.specializationValue );
        this.timePicker = false;
        this.assignPhysicianData( physicians );
    }

    handlePhysicianChange(event) {
        console.log('handlePhysicianChange : ',event.detail.value);
        this.physiciansValue = event.detail.value;
    }

    handleRowAction(event){
        this.appointedPhysicianDetails = event.detail.row;
        console.log('dataRow@@ ', this.appointedPhysicianDetails);
        this.openModal();
    }

    openModal() {
        // to open modal set isModalOpen tarck value as true
        this.isModalOpen = true;
    }
    closeModal() {
        // to close modal set isModalOpen tarck value as false
        this.isModalOpen = false;
    }
    submitDetails() {
        insertPatientRecord({ patientName : this.patientName, 
                              patientEmail : this.patientEmail, 
                              patientAddress: this.patientAddress, 
                              patientMobile : this.patientMobile, 
                              physician: this.appointedPhysicianDetails.Id ,
                              appointmentTime: this.date
        })
        .then(result => {
            console.log('patiendRecordString : ', result);
            //this.syncToGoogle();
            this.showInfoToast( 'Success', 'Booking Successfully Confirmed', 'success' );
            window.location.reload();
        })
        .catch(error => {
            this.showInfoToast( 'Error', JSON.stringify(error), 'error' );
        });
        this.isModalOpen = false;
    }
    patientNameAction( event){
        this.patientName = event.target.value;;
    }
    patientEmailAction( event){
        this.patientEmail = event.target.value;
    }
    patientAddressAction( event){
        this.patientAddress = event.target.value;
    }
    patientPhoneAction( event){
        this.patiendMobile = event.target.value;
    }

    showInfoToast( titleInfo, messageInfo, variantInfo ) {
        const evt = new ShowToastEvent({
            title: titleInfo,
            message: messageInfo,
            variant: variantInfo,
            mode: 'dismissable'
        });
        this.dispatchEvent(evt);
    }

    syncToGoogle(){
        var event = {
            'summary': 'Google I/O 2022',
            'location': '800 Howard St., San Francisco, CA 94103',
            'description': 'A chance to hear more about Google\'s developer products.',
            'start': {
              'dateTime': '2022-02-28T09:00:00-07:00',
              'timeZone': 'America/Los_Angeles'
            },
            'end': {
              'dateTime': '2022-02-28T17:00:00-07:00',
              'timeZone': 'America/Los_Angeles'
            },
            'recurrence': [
              'RRULE:FREQ=DAILY;COUNT=2'
            ],
            'attendees': [
              {'email': 'ashishjangid95@gmail.com'},
              {'email': 'abhi00092@gmail.com'}
            ],
            'reminders': {
              'useDefault': false,
              'overrides': [
                {'method': 'email', 'minutes': 24 * 60},
                {'method': 'popup', 'minutes': 10}
              ]
            }
        };
          
        var request = gapi.client.calendar.events.insert({
            'calendarId': 'primary',
            'resource': event
        });
          
        request.execute(function(event) {
            appendPre('Event created: ' + event.htmlLink);
        });
    }
}