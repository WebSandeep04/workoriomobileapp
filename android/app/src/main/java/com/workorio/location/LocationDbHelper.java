package com.workorio.location;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

public class LocationDbHelper extends SQLiteOpenHelper {

    private static final String DATABASE_NAME = "workorio_location.db";
    private static final int DATABASE_VERSION = 1;

    public static final String TABLE_NAME = "locations";
    public static final String COLUMN_ID = "id";
    public static final String COLUMN_LAT = "latitude";
    public static final String COLUMN_LNG = "longitude";
    public static final String COLUMN_ACC = "accuracy";
    public static final String COLUMN_TIME = "timestamp";
    public static final String COLUMN_SYNC = "sync_status"; // 0: pending, 1: synced

    private static final String TABLE_CREATE =
            "CREATE TABLE " + TABLE_NAME + " (" +
                    COLUMN_ID + " INTEGER PRIMARY KEY AUTOINCREMENT, " +
                    COLUMN_LAT + " REAL, " +
                    COLUMN_LNG + " REAL, " +
                    COLUMN_ACC + " REAL, " +
                    COLUMN_TIME + " INTEGER, " +
                    COLUMN_SYNC + " INTEGER DEFAULT 0);";

    public LocationDbHelper(Context context) {
        super(context, DATABASE_NAME, null, DATABASE_VERSION);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        db.execSQL(TABLE_CREATE);
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        db.execSQL("DROP TABLE IF EXISTS " + TABLE_NAME);
        onCreate(db);
    }

    public long insertLocation(double lat, double lng, float acc, long time) {
        SQLiteDatabase db = this.getWritableDatabase();
        ContentValues values = new ContentValues();
        values.put(COLUMN_LAT, lat);
        values.put(COLUMN_LNG, lng);
        values.put(COLUMN_ACC, acc);
        values.put(COLUMN_TIME, time);
        values.put(COLUMN_SYNC, 0);
        return db.insert(TABLE_NAME, null, values);
    }

    public void markSynced(long id) {
        SQLiteDatabase db = this.getWritableDatabase();
        ContentValues values = new ContentValues();
        values.put(COLUMN_SYNC, 1);
        db.update(TABLE_NAME, values, COLUMN_ID + " = ?", new String[]{String.valueOf(id)});
    }

    public Cursor getUnsyncedLocations() {
        SQLiteDatabase db = this.getReadableDatabase();
        return db.query(TABLE_NAME, null, COLUMN_SYNC + " = 0", null, null, null, COLUMN_TIME + " ASC");
    }
}
