/**
 * AvailabilityService Tests
 * Tests for overlap detection, OOS blocking, and occupancy state
 */

import { availabilityService } from '../availabilityService';
import { IRoom, IBooking, RoomStatus, BookingStatus, RoomType, RoomOccupancy } from '../../types';

describe('AvailabilityService', () => {
  const testRoom: IRoom = {
    id: 'room-1',
    number: '101',
    type: RoomType.SINGLE,
    capacity: 1,
    floor: 1,
    pricePerNight: 950,
    status: RoomStatus.CLEAN
  };

  const testRoomOOS: IRoom = {
    ...testRoom,
    id: 'room-2',
    number: '102',
    status: RoomStatus.OUT_OF_SERVICE,
    outOfServiceReason: 'Maintenance'
  };

  describe('checkOverlap', () => {
    it('should detect overlap when new booking starts during existing booking', () => {
      const bookings: IBooking[] = [{
        id: 'b1',
        roomId: 'room-1',
        startDate: '2025-01-10',
        endDate: '2025-01-15',
        status: BookingStatus.CONFIRMED,
        customerType: 'Person' as any,
        customerName: 'Test',
        customerEmail: 'test@test.com',
        customerPhone: '123',
        billingAddress: 'Test',
        guestCount: 1,
        bookingMode: 'Individual',
        paymentMethod: 'Invoice' as any,
        cardGuaranteeRequired: false,
        totalPrice: 4750,
        extraFees: []
      }];

      const hasOverlap = availabilityService.checkOverlap(
        'room-1',
        '2025-01-12',
        '2025-01-18',
        bookings
      );

      expect(hasOverlap).toBe(true);
    });

    it('should detect overlap when new booking ends during existing booking', () => {
      const bookings: IBooking[] = [{
        id: 'b1',
        roomId: 'room-1',
        startDate: '2025-01-10',
        endDate: '2025-01-15',
        status: BookingStatus.CONFIRMED,
        customerType: 'Person' as any,
        customerName: 'Test',
        customerEmail: 'test@test.com',
        customerPhone: '123',
        billingAddress: 'Test',
        guestCount: 1,
        bookingMode: 'Individual',
        paymentMethod: 'Invoice' as any,
        cardGuaranteeRequired: false,
        totalPrice: 4750,
        extraFees: []
      }];

      const hasOverlap = availabilityService.checkOverlap(
        'room-1',
        '2025-01-05',
        '2025-01-12',
        bookings
      );

      expect(hasOverlap).toBe(true);
    });

    it('should not detect overlap when dates are adjacent (checkout day = checkin day)', () => {
      const bookings: IBooking[] = [{
        id: 'b1',
        roomId: 'room-1',
        startDate: '2025-01-10',
        endDate: '2025-01-15',
        status: BookingStatus.CONFIRMED,
        customerType: 'Person' as any,
        customerName: 'Test',
        customerEmail: 'test@test.com',
        customerPhone: '123',
        billingAddress: 'Test',
        guestCount: 1,
        bookingMode: 'Individual',
        paymentMethod: 'Invoice' as any,
        cardGuaranteeRequired: false,
        totalPrice: 4750,
        extraFees: []
      }];

      const hasOverlap = availabilityService.checkOverlap(
        'room-1',
        '2025-01-15', // Same as checkout day (allowed)
        '2025-01-20',
        bookings
      );

      expect(hasOverlap).toBe(false);
    });

    it('should exclude cancelled bookings from overlap check', () => {
      const bookings: IBooking[] = [{
        id: 'b1',
        roomId: 'room-1',
        startDate: '2025-01-10',
        endDate: '2025-01-15',
        status: BookingStatus.CANCELLED,
        customerType: 'Person' as any,
        customerName: 'Test',
        customerEmail: 'test@test.com',
        customerPhone: '123',
        billingAddress: 'Test',
        guestCount: 1,
        bookingMode: 'Individual',
        paymentMethod: 'Invoice' as any,
        cardGuaranteeRequired: false,
        totalPrice: 4750,
        extraFees: []
      }];

      const hasOverlap = availabilityService.checkOverlap(
        'room-1',
        '2025-01-12',
        '2025-01-18',
        bookings
      );

      expect(hasOverlap).toBe(false);
    });

    it('should exclude specified booking ID from overlap check', () => {
      const bookings: IBooking[] = [{
        id: 'b1',
        roomId: 'room-1',
        startDate: '2025-01-10',
        endDate: '2025-01-15',
        status: BookingStatus.CONFIRMED,
        customerType: 'Person' as any,
        customerName: 'Test',
        customerEmail: 'test@test.com',
        customerPhone: '123',
        billingAddress: 'Test',
        guestCount: 1,
        bookingMode: 'Individual',
        paymentMethod: 'Invoice' as any,
        cardGuaranteeRequired: false,
        totalPrice: 4750,
        extraFees: []
      }];

      const hasOverlap = availabilityService.checkOverlap(
        'room-1',
        '2025-01-12',
        '2025-01-18',
        bookings,
        'b1' // Exclude this booking
      );

      expect(hasOverlap).toBe(false);
    });
  });

  describe('isBookable', () => {
    it('should return false for OUT_OF_SERVICE rooms', () => {
      const bookings: IBooking[] = [];

      const isBookable = availabilityService.isBookable(
        'room-2',
        '2025-01-10',
        '2025-01-15',
        testRoomOOS,
        bookings
      );

      expect(isBookable).toBe(false);
    });

    it('should return false when dates overlap with existing booking', () => {
      const bookings: IBooking[] = [{
        id: 'b1',
        roomId: 'room-1',
        startDate: '2025-01-10',
        endDate: '2025-01-15',
        status: BookingStatus.CONFIRMED,
        customerType: 'Person' as any,
        customerName: 'Test',
        customerEmail: 'test@test.com',
        customerPhone: '123',
        billingAddress: 'Test',
        guestCount: 1,
        bookingMode: 'Individual',
        paymentMethod: 'Invoice' as any,
        cardGuaranteeRequired: false,
        totalPrice: 4750,
        extraFees: []
      }];

      const isBookable = availabilityService.isBookable(
        'room-1',
        '2025-01-12',
        '2025-01-18',
        testRoom,
        bookings
      );

      expect(isBookable).toBe(false);
    });

    it('should return true when room is available and dates do not overlap', () => {
      const bookings: IBooking[] = [{
        id: 'b1',
        roomId: 'room-1',
        startDate: '2025-01-10',
        endDate: '2025-01-15',
        status: BookingStatus.CONFIRMED,
        customerType: 'Person' as any,
        customerName: 'Test',
        customerEmail: 'test@test.com',
        customerPhone: '123',
        billingAddress: 'Test',
        guestCount: 1,
        bookingMode: 'Individual',
        paymentMethod: 'Invoice' as any,
        cardGuaranteeRequired: false,
        totalPrice: 4750,
        extraFees: []
      }];

      const isBookable = availabilityService.isBookable(
        'room-1',
        '2025-01-15', // Starts on checkout day (allowed)
        '2025-01-20',
        testRoom,
        bookings
      );

      expect(isBookable).toBe(true);
    });

    it('should return false when start date >= end date', () => {
      const bookings: IBooking[] = [];

      const isBookable = availabilityService.isBookable(
        'room-1',
        '2025-01-15',
        '2025-01-10', // End before start
        testRoom,
        bookings
      );

      expect(isBookable).toBe(false);
    });
  });

  describe('getRoomOccupancyState', () => {
    it('should return FREE when no bookings exist', () => {
      const bookings: IBooking[] = [];
      const today = new Date('2025-01-10');

      const state = availabilityService.getRoomOccupancyState(
        'room-1',
        today,
        testRoom,
        bookings
      );

      expect(state.state).toBe(RoomOccupancy.FREE);
      expect(state.currentBooking).toBeUndefined();
    });

    it('should return RESERVED for confirmed booking on arrival date', () => {
      const bookings: IBooking[] = [{
        id: 'b1',
        roomId: 'room-1',
        startDate: '2025-01-10',
        endDate: '2025-01-15',
        status: BookingStatus.CONFIRMED,
        customerType: 'Person' as any,
        customerName: 'Test',
        customerEmail: 'test@test.com',
        customerPhone: '123',
        billingAddress: 'Test',
        guestCount: 1,
        bookingMode: 'Individual',
        paymentMethod: 'Invoice' as any,
        cardGuaranteeRequired: false,
        totalPrice: 4750,
        extraFees: []
      }];

      const arrivalDate = new Date('2025-01-10');
      const state = availabilityService.getRoomOccupancyState(
        'room-1',
        arrivalDate,
        testRoom,
        bookings
      );

      expect(state.state).toBe(RoomOccupancy.RESERVED);
      expect(state.currentBooking?.id).toBe('b1');
    });

    it('should return OCCUPIED for checked-in booking', () => {
      const bookings: IBooking[] = [{
        id: 'b1',
        roomId: 'room-1',
        startDate: '2025-01-10',
        endDate: '2025-01-15',
        status: BookingStatus.CHECKED_IN,
        customerType: 'Person' as any,
        customerName: 'Test',
        customerEmail: 'test@test.com',
        customerPhone: '123',
        billingAddress: 'Test',
        guestCount: 1,
        bookingMode: 'Individual',
        paymentMethod: 'Invoice' as any,
        cardGuaranteeRequired: false,
        totalPrice: 4750,
        extraFees: []
      }];

      const duringStay = new Date('2025-01-12');
      const state = availabilityService.getRoomOccupancyState(
        'room-1',
        duringStay,
        testRoom,
        bookings
      );

      expect(state.state).toBe(RoomOccupancy.OCCUPIED);
      expect(state.currentBooking?.id).toBe('b1');
    });

    it('should return DEPARTING for checked-in booking on checkout date', () => {
      const bookings: IBooking[] = [{
        id: 'b1',
        roomId: 'room-1',
        startDate: '2025-01-10',
        endDate: '2025-01-15',
        status: BookingStatus.CHECKED_IN,
        customerType: 'Person' as any,
        customerName: 'Test',
        customerEmail: 'test@test.com',
        customerPhone: '123',
        billingAddress: 'Test',
        guestCount: 1,
        bookingMode: 'Individual',
        paymentMethod: 'Invoice' as any,
        cardGuaranteeRequired: false,
        totalPrice: 4750,
        extraFees: []
      }];

      const checkoutDate = new Date('2025-01-14'); // Day before checkout (departing today)
      const state = availabilityService.getRoomOccupancyState(
        'room-1',
        checkoutDate,
        testRoom,
        bookings
      );

      expect(state.state).toBe(RoomOccupancy.DEPARTING);
      expect(state.currentBooking?.id).toBe('b1');
    });
  });

  describe('getAvailableRooms', () => {
    it('should exclude OUT_OF_SERVICE rooms', () => {
      const rooms: IRoom[] = [testRoom, testRoomOOS];
      const bookings: IBooking[] = [];

      const available = availabilityService.getAvailableRooms(
        '2025-01-10',
        '2025-01-15',
        rooms,
        bookings
      );

      expect(available.length).toBe(1);
      expect(available[0].id).toBe('room-1');
      expect(available.some(r => r.id === 'room-2')).toBe(false);
    });

    it('should exclude rooms with overlapping bookings', () => {
      const rooms: IRoom[] = [testRoom];
      const bookings: IBooking[] = [{
        id: 'b1',
        roomId: 'room-1',
        startDate: '2025-01-10',
        endDate: '2025-01-15',
        status: BookingStatus.CONFIRMED,
        customerType: 'Person' as any,
        customerName: 'Test',
        customerEmail: 'test@test.com',
        customerPhone: '123',
        billingAddress: 'Test',
        guestCount: 1,
        bookingMode: 'Individual',
        paymentMethod: 'Invoice' as any,
        cardGuaranteeRequired: false,
        totalPrice: 4750,
        extraFees: []
      }];

      const available = availabilityService.getAvailableRooms(
        '2025-01-12',
        '2025-01-18',
        rooms,
        bookings
      );

      expect(available.length).toBe(0);
    });
  });
});

