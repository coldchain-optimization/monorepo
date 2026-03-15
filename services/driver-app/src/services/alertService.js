import { Alert } from 'react-native';

/**
 * Notification/Alert service for driver app
 */

export class AlertService {
  /**
   * Show location mismatch alert for pickup
   */
  static showPickupLocationMismatch(distance, onRetry) {
    Alert.alert(
      'Location Mismatch',
      `You are ${distance} from the pickup location. You must be at the source to mark picked.`,
      [
        { text: 'OK', style: 'cancel' },
        { text: 'Retry', onPress: onRetry },
      ]
    );
  }

  /**
   * Show location mismatch alert for delivery
   */
  static showDeliveryLocationMismatch(distance, onRetry, onEmergency) {
    Alert.alert(
      'Location Mismatch',
      `You are ${distance} from the delivery location. Deliver only at destination unless it\'s an emergency.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Retry', onPress: onRetry },
        { text: 'Emergency Delivery', onPress: onEmergency, style: 'destructive' },
      ]
    );
  }

  /**
   * Show confirmation alert before marking as picked
   */
  static showPickupConfirmation(sourceLocation, onConfirm, onCancel) {
    Alert.alert(
      'Confirm Pickup',
      `Mark shipment as picked from ${sourceLocation}?`,
      [
        { text: 'Cancel', onPress: onCancel, style: 'cancel' },
        { text: 'Confirm', onPress: onConfirm, style: 'default' },
      ]
    );
  }

  /**
   * Show confirmation alert before marking as delivered
   */
  static showDeliveryConfirmation(destinationLocation, onConfirm, onCancel) {
    Alert.alert(
      'Confirm Delivery',
      `Mark shipment as delivered to ${destinationLocation}?`,
      [
        { text: 'Cancel', onPress: onCancel, style: 'cancel' },
        { text: 'Confirm', onPress: onConfirm, style: 'default' },
      ]
    );
  }

  /**
   * Show success alert
   */
  static showSuccess(title, message, onDismiss) {
    Alert.alert(title, message, [{ text: 'OK', onPress: onDismiss }]);
  }

  /**
   * Show error alert
   */
  static showError(title, message, onDismiss) {
    Alert.alert(
      title,
      message,
      [{ text: 'OK', onPress: onDismiss }],
      { cancelable: false }
    );
  }

  /**
   * Show emergency delivery consent popup
   */
  static showEmergencyDeliveryConsent(onApprove, onReject) {
    Alert.alert(
      'Emergency Delivery Request',
      'You are attempting to deliver away from the destination. This requires shipper consent. Request will be sent to shipper. Proceed?',
      [
        { text: 'Cancel', onPress: onReject, style: 'cancel' },
        { text: 'Send Request', onPress: onApprove, style: 'default' },
      ]
    );
  }

  /**
   * Show loading/progress dialog (for longer operations)
   */
  static showLoading(title, message) {
    // Note: React Native doesn't have a built-in loading dialog
    // This would typically use a custom modal or library
    console.log(`[AlertService] Loading: ${title} - ${message}`);
  }

  /**
   * Dismiss any open alerts
   */
  static dismiss() {
    // Alert.alert has no dismiss method, but we can use the return value
    console.log('[AlertService] Alert dismissed');
  }
}

export default AlertService;
