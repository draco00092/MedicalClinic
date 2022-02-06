public with sharing class medicalClinicComponentCtrl {
    @AuraEnabled(cacheable = true)
    public static List<Specialization__c> getSpecificationNames(){
        try {
            List<Specialization__c> specializationRecordList = [ SELECT Id, Name, Appointment_fee__c,
                                                                    ( SELECT Id, Name FROM Physicians__r ) 
                                                                 FROM Specialization__c 
                                                                ];

            return specializationRecordList;

        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled(cacheable = true)
    public static List<Appointment__c> getAppointments(String physicianId, Date selectedDate){
        try {
            List<Appointment__c> appointmentRecordList = [ SELECT Id, Name, Patient__r.Name, Physician__r.Name,
                                                           Appointment_Time__c, Patient__r.Phone__c, Patient__r.Email__c
                                                           FROM Appointment__c
                                                           WHERE ID =: physicianId
                                                           AND Appointment_Date__c =: selectedDate
                                                         ];

            return appointmentRecordList;

        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
    @AuraEnabled
    public static List<Physician__c> getAvailablePhysicians( Datetime appointmentTime, String specializationId ){
        try {
            System.debug( 'specializationId : '+ specializationId );
            System.debug( 'appointmentTime : '+ appointmentTime );
            Datetime startDateTime = Datetime.newInstance(appointmentTime.year(), appointmentTime.Month(), appointmentTime.Day(), appointmentTime.hour(), 00, 00);
            //Datetime endDateTime = Datetime.newInstance(dt.year(), dt.Month(), dt.Day(), 23, 59, 59);
            
            Set<Id> appointedPhysiciansIds = new Set<Id>();
            for( Appointment__c apnt : [ SELECT Id, Name, Physician__r.Specialization__c,
                                            Appointment_Time__c, Patient__r.Phone__c, Patient__r.Email__c,
                                            Physician__c
                                            FROM Appointment__c
                                            WHERE Physician__r.Specialization__c =: specializationId AND Appointment_Time__c =: startDateTime ] )
            {
                appointedPhysiciansIds.add(apnt.Physician__c);
            }

            List<Physician__c> availablePhysiciansList = [ SELECT Id, Name, Email__c, Specialization__r.Name FROM Physician__c WHERE Specialization__c =: specializationId AND Id NOT IN:appointedPhysiciansIds ];
            
            return availablePhysiciansList;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static String insertPatientRecord( String patientName, String patientEmail, String patientAddress, String patientMobile, String physician, Datetime appointmentTime ){
        try {
            List<Patient__c> patientRecordList = [ SELECT Id, Name FROM Patient__c WHERE Email__c =: patientEmail ];
            List<Physician__c> physicianRecord = [ SELECT Id, Name, Email__c, Specialization__r.Name, OwnerId FROM Physician__c WHERE Id =: physician ];
            Patient__c patient = new Patient__c();
            String patientId = '';
            if( patientRecordList != null && patientRecordList.size() > 0 ){
                //patientId = patientRecordList[0].Id;
                patient = patientRecordList[0];
            }
            else{
                Patient__c patientRecord = new Patient__c();
                patientRecord.Name = patientName;
                patientRecord.Email__c = patientEmail;
                patientRecord.Phone__c = patientMobile;
                patientRecord.Address__c = patientAddress;

                insert patientRecord;
                
                //patientId = patientRecord.Id;
                if( patientRecord.Id != null ){
                    patient = patientRecord;
                }
            }

            Datetime startDateTime = Datetime.newInstance(appointmentTime.year(), appointmentTime.Month(), appointmentTime.Day(), appointmentTime.hour(), 00, 00);
            Datetime endDateTime = Datetime.newInstance(appointmentTime.year(), appointmentTime.Month(), appointmentTime.Day(), appointmentTime.hour() + 1, 00, 00);
            Appointment__c appointmentRecord = new Appointment__c();
            appointmentRecord.Patient__c = patient.Id;
            appointmentRecord.Physician__c = physician;
            appointmentRecord.Appointment_Time__c = startDateTime;

            insert appointmentRecord;

            if( appointmentRecord.Id != null ){
                createEvent(physicianRecord[0], startDateTime, endDateTime);
                //sendMail( patientEmail, physicianRecord[0].Email__c, physicianRecord[0], patient, appointmentRecord );
            }
            return appointmentRecord.Id;
        } catch (Exception e) {
            throw new AuraHandledException('Unable to send Email : '+e.getMessage());
        }
    }

    public static void sendMail( String toMail, String ccMail, Physician__c physician, Patient__c patient, Appointment__c bookingRecord ){
        Messaging.SingleEmailMessage email = new Messaging.SingleEmailMessage();
        string[] toAddresses = new string[] {toMail};
        string[] ccAddresses = new string[] {ccMail};
        
        email.setReplyTo(ccMail);
        email.setToAddresses(toAddresses);
        email.setCcAddresses(ccAddresses);

        email.setSubject('Appointment Booking Confirmed with '+ physician.Name);

        String emailBody = 'Hi '+patient.Name+' <br /> You booking is confirmed with the following details: <br /> <table border="1px"> <tr> <th> Physician </th> <th> Specialization </th> <th> Booking Time </th> </tr> <tr> <td>'+ physician.Name+' </td> <td>'+ physician.Specialization__r.Name+' </td> <td>'+ bookingRecord.Appointment_Time__c+' </td> </tr> </table> <br/> Thank';
        
        email.setHtmlBody(emailBody);
        try{
            Messaging.sendEmail(new Messaging.SingleEmailMessage[] { email });
        }catch(exception e){
            throw new AuraHandledException(e.getMessage());
        }
    }

    public static void createEvent( Physician__c physician, Datetime startDateTime, Datetime endDateTime){
        Event physicianEvent = new Event();
        physicianEvent.Type = 'Email';
        physicianEvent.Subject = 'Meeting';
        //physicianEvent.Email = physician.Email__c;
        physicianEvent.WhatId = physician.Id;
        physicianEvent.StartDateTime = startDateTime;
        physicianEvent.EndDateTime = endDateTime;
        physicianEvent.OwnerId = physician.OwnerId;
        insert physicianEvent;
    }
}